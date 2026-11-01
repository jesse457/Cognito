<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\KtEngine;
use App\Models\KnowledgeComponent;
use App\Models\Lesson;
use App\Models\StudentKcMastery;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Turns low-mastery knowledge components into concrete remediation targets.
 *
 * Reads the mastery values produced by the KT engine — it never computes mastery
 * itself. Returns the weakest KCs plus the lessons that teach them so the client
 * can offer "go back and practice this".
 */
class AdaptiveContentService
{
    /**
     * @return array{
     *     threshold: float,
     *     engine: string,
     *     weak_components: list<array<string,mixed>>,
     *     recommended_lessons: list<array<string,mixed>>
     * }
     */
    public function recommendations(User $user, ?int $courseId = null): array
    {
        $threshold = (float) config('features.at_risk_threshold');

        $query = StudentKcMastery::query()
            ->with('knowledgeComponent.course')
            ->where('user_id', $user->getKey())
            ->where('mastery_probability', '<', $threshold)
            ->orderBy('mastery_probability');

        if ($courseId !== null) {
            $query->whereHas('knowledgeComponent', fn ($builder) => $builder->where('course_id', $courseId));
        }

        /** @var Collection<int, StudentKcMastery> $masteries */
        $masteries = $query->limit(20)->get();

        $lessonIds = Lesson::query()
            ->whereHas('knowledgeComponents', fn ($builder) => $builder
                ->whereIn('knowledge_components.id', $masteries->pluck('knowledge_component_id')))
            ->pluck('id');

        $lessons = Lesson::query()
            ->whereIn('id', $lessonIds)
            ->with('module.course')
            ->get()
            ->map(fn (Lesson $lesson): array => [
                'lesson_id' => $lesson->getKey(),
                'title' => $lesson->title,
                'course_id' => $lesson->module?->course_id,
                'course_title' => $lesson->module?->course?->title,
                'content_type' => $lesson->content_type?->value,
            ])
            ->values()
            ->all();

        return [
            'threshold' => $threshold,
            'engine' => (string) config('features.kt_engine'),
            'weak_components' => $masteries->map(fn (StudentKcMastery $mastery): array => [
                'knowledge_component_id' => $mastery->knowledge_component_id,
                'name' => $mastery->knowledgeComponent?->name,
                'course_id' => $mastery->knowledgeComponent?->course_id,
                'mastery_probability' => (float) $mastery->mastery_probability,
                'model_used' => $mastery->model_used instanceof KtEngine
                    ? $mastery->model_used->value
                    : (string) $mastery->model_used,
                'last_updated' => $mastery->last_updated?->toIso8601String(),
            ])->values()->all(),
            'recommended_lessons' => $lessons,
        ];
    }

    /**
     * Called after a quiz completes: records what remediation would be offered.
     * Kept side-effect-free on purpose — the next request reads the same result.
     */
    public function rehabilitateAfterQuiz(User $user, ?int $courseId = null): array
    {
        $recommendations = $this->recommendations($user, $courseId);

        Log::info('adaptive.remediation_requested', [
            'user_id' => $user->getKey(),
            'course_id' => $courseId,
            'threshold' => $recommendations['threshold'],
            'weak_component_ids' => array_column($recommendations['weak_components'], 'knowledge_component_id'),
            'recommended_lesson_ids' => array_column($recommendations['recommended_lessons'], 'lesson_id'),
        ]);

        return $recommendations;
    }

    /**
     * Order a course's lessons so the weakest knowledge components come first.
     *
     * @return Collection<int, Lesson>
     */
    public function prioritiseLessons(User $user, int $courseId): Collection
    {
        $masteries = StudentKcMastery::query()
            ->where('user_id', $user->getKey())
            ->whereHas('knowledgeComponent', fn ($builder) => $builder->where('course_id', $courseId))
            ->pluck('mastery_probability', 'knowledge_component_id');

        return Lesson::query()
            ->whereHas('module', fn ($builder) => $builder->where('course_id', $courseId))
            ->with('knowledgeComponents')
            ->get()
            ->sortBy(function (Lesson $lesson) use ($masteries): float {
                $lowest = 1.0;

                foreach ($lesson->knowledgeComponents as $component) {
                    $probability = $masteries[$component->getKey()] ?? null;

                    if ($probability !== null) {
                        $lowest = min($lowest, (float) $probability);
                    }
                }

                return $lowest;
            })
            ->values();
    }

    /** Convenience helper used by dashboards. */
    public function isAtRisk(User $user, KnowledgeComponent $component): bool
    {
        $mastery = StudentKcMastery::query()
            ->where('user_id', $user->getKey())
            ->where('knowledge_component_id', $component->getKey())
            ->value('mastery_probability');

        return $mastery !== null && (float) $mastery < (float) config('features.at_risk_threshold');
    }
}
