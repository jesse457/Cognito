<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\KtEngine;
use App\Events\MasteryDropped;
use App\Models\AnswerHistory;
use App\Models\KnowledgeComponent;
use App\Models\StudentKcMastery;
use App\Models\User;
use App\Services\KnowledgeTracing\BktEstimator;
use App\Services\KnowledgeTracing\KtClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Recomputes a student's per-KC mastery.
 *
 * Graceful degradation is mandatory: the job POSTs to the Python KT service and,
 * on ANY failure (5xx, timeout, DNS, malformed payload), logs a structured
 * warning and falls back to the Laravel-side BKT estimator. It never rethrows,
 * so a KT outage can never fail a student's quiz submission.
 */
class UpdateStudentMastery implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 30, 60];

    /**
     * @param  list<int>  $knowledgeComponentIds
     */
    public function __construct(
        public readonly int $userId,
        public readonly array $knowledgeComponentIds = [],
        public readonly ?int $courseId = null,
    ) {}

    public function handle(KtClient $client, BktEstimator $fallback): void
    {
        $user = User::query()->find($this->userId);

        if ($user === null) {
            Log::warning('kt.user_missing', ['user_id' => $this->userId]);

            return;
        }

        $componentIds = $this->knowledgeComponentIds !== []
            ? $this->knowledgeComponentIds
            : $this->componentIdsFromHistory($user);

        if ($componentIds === []) {
            Log::info('kt.no_history', ['user_id' => $user->getKey()]);

            return;
        }

        $observations = $this->observationsByComponent($user, $componentIds);
        $history = $this->historyPayload($user, $componentIds);

        [$engine, $predictions] = $this->predict($user, $componentIds, $observations, $history, $client, $fallback);

        $this->persist($user, $engine, $predictions);
    }

    /**
     * @param  list<int>  $componentIds
     * @param  array<int, list<bool>>  $observations
     * @param  list<array{kc_id:int, correct:int, timestamp:string}>  $history
     * @return array{0: KtEngine, 1: array<int, float>}
     */
    private function predict(
        User $user,
        array $componentIds,
        array $observations,
        array $history,
        KtClient $client,
        BktEstimator $fallback,
    ): array {
        $requestedEngine = KtEngine::fromConfig(config('features.kt_engine'));

        if ($history !== []) {
            try {
                $response = $client->predictMastery($user->getKey(), $history);
                $predictions = $this->normalisePredictions($response['mastery'], $componentIds);

                if ($predictions !== []) {
                    return [KtEngine::fromConfig($response['engine']), $predictions];
                }

                Log::warning('kt.service_empty_response', [
                    'user_id' => $user->getKey(),
                    'engine' => $response['engine'],
                    'kc_ids' => $componentIds,
                ]);
            } catch (Throwable $exception) {
                Log::warning('kt.service_unavailable_falling_back_to_bkt', [
                    'user_id' => $user->getKey(),
                    'requested_engine' => $requestedEngine->value,
                    'kt_service_url' => $client->baseUrl(),
                    'kc_ids' => $componentIds,
                    'exception' => $exception::class,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        Log::info('kt.bkt_fallback_used', [
            'user_id' => $user->getKey(),
            'engine' => KtEngine::Bkt->value,
            'kc_ids' => $componentIds,
            'parameters' => $fallback->parameters(),
        ]);

        return [KtEngine::Bkt, $fallback->predictMany($observations)];
    }

    /**
     * @param  list<array{kc_id:int, probability:float}>  $mastery
     * @param  list<int>  $componentIds
     * @return array<int, float>
     */
    private function normalisePredictions(array $mastery, array $componentIds): array
    {
        $allowed = array_flip($componentIds);
        $predictions = [];

        foreach ($mastery as $row) {
            $componentId = (int) ($row['kc_id'] ?? 0);

            if ($componentId === 0 || ! isset($allowed[$componentId])) {
                continue;
            }

            $predictions[$componentId] = round(min(1.0, max(0.0, (float) ($row['probability'] ?? 0.0))), 4);
        }

        return $predictions;
    }

    /** @param array<int, float> $predictions */
    private function persist(User $user, KtEngine $engine, array $predictions): void
    {
        foreach ($predictions as $componentId => $probability) {
            $existing = StudentKcMastery::query()
                ->where('user_id', $user->getKey())
                ->where('knowledge_component_id', $componentId)
                ->first();

            $previous = $existing === null ? null : (float) $existing->mastery_probability;

            StudentKcMastery::query()->updateOrCreate(
                [
                    'user_id' => $user->getKey(),
                    'knowledge_component_id' => $componentId,
                ],
                [
                    'mastery_probability' => $probability,
                    'model_used' => $engine->value,
                    'last_updated' => now(),
                ],
            );

            if ($previous !== null && $probability < $previous) {
                $this->announceDrop($user, $componentId, $previous, $probability);
            }
        }
    }

    private function announceDrop(User $user, int $componentId, float $previous, float $current): void
    {
        $component = KnowledgeComponent::query()->find($componentId);

        if ($component === null) {
            return;
        }

        MasteryDropped::dispatch($user, $component, $previous, $current);
    }

    /** @return list<int> */
    private function componentIdsFromHistory(User $user): array
    {
        return AnswerHistory::query()
            ->where('user_id', $user->getKey())
            ->whereNotNull('knowledge_component_id')
            ->pluck('knowledge_component_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $componentIds
     * @return array<int, list<bool>>
     */
    private function observationsByComponent(User $user, array $componentIds): array
    {
        $rows = AnswerHistory::query()
            ->where('user_id', $user->getKey())
            ->whereIn('knowledge_component_id', $componentIds)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['knowledge_component_id', 'is_correct']);

        $byComponent = [];

        foreach ($rows as $row) {
            $byComponent[(int) $row->knowledge_component_id][] = (bool) $row->is_correct;
        }

        foreach ($componentIds as $componentId) {
            $byComponent[$componentId] ??= [];
        }

        return $byComponent;
    }

    /**
     * @param  list<int>  $componentIds
     * @return list<array{kc_id:int, correct:int, timestamp:string}>
     */
    private function historyPayload(User $user, array $componentIds): array
    {
        $limit = (int) config('cognita.kt.default_history_limit', 500);

        return AnswerHistory::query()
            ->where('user_id', $user->getKey())
            ->whereIn('knowledge_component_id', $componentIds)
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit($limit)
            ->get(['knowledge_component_id', 'is_correct', 'created_at'])
            ->map(static fn (AnswerHistory $answer): array => [
                'kc_id' => (int) $answer->knowledge_component_id,
                'correct' => $answer->is_correct ? 1 : 0,
                'timestamp' => (string) $answer->created_at?->toIso8601String(),
            ])
            ->all();
    }
}
