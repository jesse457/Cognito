<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Models\CohortAnalyticsSnapshot;
use App\Models\KnowledgeComponent;
use App\Models\PrivateClass;
use App\Models\StudentKcMastery;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Cohort-level analytics for a private class.
 *
 * Reads `student_kc_mastery` only — mastery is produced by the KT engine, never
 * by this portal. A snapshot materialises the student × knowledge-component
 * matrix into `cohort_analytics_snapshots.metrics` so the dashboard can render a
 * heatmap without re-aggregating on every request.
 *
 * Every public method is a hard no-op while `features.instructor_path` is off:
 * zero queries, empty results.
 */
class CohortAnalyticsService
{
    public function __construct(private readonly ClassAccessService $access) {}

    /**
     * Build and persist today's snapshot for one class.
     */
    public function snapshot(User $instructor, int $classId): ?CohortAnalyticsSnapshot
    {
        if (! $this->enabled()) {
            return null;
        }

        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        $metrics = $this->buildMetrics($class);

        return CohortAnalyticsSnapshot::query()->updateOrCreate(
            [
                'class_id' => $class->getKey(),
                'snapshot_date' => now()->toDateString(),
            ],
            ['metrics' => $metrics],
        );
    }

    /**
     * Snapshot every active class of every instructor. Used by the scheduled job.
     *
     * @return int number of classes snapshotted
     */
    public function snapshotAll(): int
    {
        if (! $this->enabled()) {
            return 0;
        }

        $count = 0;

        PrivateClass::query()
            ->where('status', ClassStatus::Active->value)
            ->select('id')
            ->chunkById(100, function (Collection $classes) use (&$count): void {
                foreach ($classes as $class) {
                    $metrics = $this->buildMetrics(PrivateClass::query()->findOrFail($class->getKey()));

                    CohortAnalyticsSnapshot::query()->updateOrCreate(
                        [
                            'class_id' => $class->getKey(),
                            'snapshot_date' => now()->toDateString(),
                        ],
                        ['metrics' => $metrics],
                    );

                    $count++;
                }
            });

        return $count;
    }

    /**
     * Student × KC heatmap plus per-KC averages for a class.
     *
     * @return array{
     *     class_id: int,
     *     students: list<array{id:int,name:string}>,
     *     kcs: list<array{id:int,name:string}>,
     *     heatmap: array<int, array<int, float>>,
     *     averages: array<int, float>,
     *     at_risk: list<int>
     * }
     */
    public function heatmap(User $instructor, int $classId): array
    {
        if (! $this->enabled()) {
            return $this->emptyHeatmap();
        }

        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        /** @var array{class_id:int,students:list<array{id:int,name:string}>,kcs:list<array{id:int,name:string}>,heatmap:array<int,array<int,float>>,averages:array<int,float>,at_risk:list<int>} $metrics */
        $metrics = $this->buildMetrics($class);

        return $metrics;
    }

    /**
     * Latest persisted snapshot for a class, if any.
     */
    public function latestSnapshot(PrivateClass $class): ?CohortAnalyticsSnapshot
    {
        return CohortAnalyticsSnapshot::query()
            ->where('class_id', $class->getKey())
            ->orderByDesc('snapshot_date')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * The full metrics payload written into `cohort_analytics_snapshots.metrics`.
     *
     * @return array{
     *     class_id: int,
     *     students: list<array{id:int,name:string}>,
     *     kcs: list<array{id:int,name:string}>,
     *     heatmap: array<int, array<int, float>>,
     *     averages: array<int, float>,
     *     at_risk: list<int>
     * }
     */
    public function buildMetrics(PrivateClass $class): array
    {
        $studentIds = $this->activeStudentIds($class);

        if ($studentIds->isEmpty()) {
            return $this->emptyHeatmap((int) $class->getKey());
        }

        $masteries = StudentKcMastery::query()
            ->whereIn('user_id', $studentIds->all())
            ->select(['id', 'user_id', 'knowledge_component_id', 'mastery_probability'])
            ->get();

        $kcIds = $masteries
            ->pluck('knowledge_component_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->unique()
            ->sort()
            ->values();

        $kcNames = $kcIds->isEmpty()
            ? new Collection
            : KnowledgeComponent::query()
                ->whereIn('id', $kcIds->all())
                ->pluck('name', 'id');

        $students = User::query()
            ->whereIn('id', $studentIds->all())
            ->orderBy('id')
            ->get(['id', 'name', 'display_name'])
            ->map(static fn (User $student): array => [
                'id' => (int) $student->getKey(),
                'name' => $student->displayLabel(),
            ])
            ->values()
            ->all();

        $heatmap = [];
        $threshold = (float) config('features.at_risk_threshold');
        $atRisk = [];

        foreach ($masteries as $mastery) {
            $studentId = (int) $mastery->user_id;
            $kcId = (int) $mastery->knowledge_component_id;
            $probability = (float) $mastery->mastery_probability;

            $heatmap[$studentId][$kcId] = $probability;

            if ($probability < $threshold) {
                $atRisk[$studentId] = true;
            }
        }

        $averages = [];

        foreach ($kcIds as $kcId) {
            $values = collect($heatmap)
                ->map(static fn (array $row): ?float => $row[$kcId] ?? null)
                ->filter(static fn (?float $value): bool => $value !== null);

            $averages[$kcId] = $values->isEmpty()
                ? 0.0
                : round((float) $values->avg(), 4);
        }

        return [
            'class_id' => (int) $class->getKey(),
            'students' => $students,
            'kcs' => $kcIds
                ->map(static fn (int $kcId): array => [
                    'id' => $kcId,
                    'name' => (string) ($kcNames[$kcId] ?? "Knowledge component #{$kcId}"),
                ])
                ->all(),
            'heatmap' => $heatmap,
            'averages' => $averages,
            'at_risk' => array_keys($atRisk),
        ];
    }

    /**
     * Aggregate averages for a class without materialising a snapshot row.
     *
     * @return array<int, float>
     */
    public function kcAverages(PrivateClass $class): array
    {
        if (! $this->enabled()) {
            return [];
        }

        $studentIds = $this->activeStudentIds($class);

        if ($studentIds->isEmpty()) {
            return [];
        }

        $rows = StudentKcMastery::query()
            ->whereIn('user_id', $studentIds->all())
            ->groupBy('knowledge_component_id')
            ->select('knowledge_component_id', DB::raw('AVG(mastery_probability) as average_probability'))
            ->get();

        $averages = [];

        foreach ($rows as $row) {
            /** @var StudentKcMastery $row */
            $averages[(int) $row->knowledge_component_id] = round((float) $row->getAttribute('average_probability'), 4);
        }

        return $averages;
    }

    /**
     * @return Collection<int, int>
     */
    private function activeStudentIds(PrivateClass $class): Collection
    {
        return $class->enrollments()
            ->where('status', EnrollmentStatus::Active->value)
            ->pluck('student_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->unique()
            ->values();
    }

    /**
     * @return array{class_id:int,students:list<array{id:int,name:string}>,kcs:list<array{id:int,name:string}>,heatmap:array<int,array<int,float>>,averages:array<int,float>,at_risk:list<int>}
     */
    private function emptyHeatmap(?int $classId = null): array
    {
        return [
            'class_id' => (int) ($classId ?? 0),
            'students' => [],
            'kcs' => [],
            'heatmap' => [],
            'averages' => [],
            'at_risk' => [],
        ];
    }

    private function enabled(): bool
    {
        return (bool) config('features.instructor_path');
    }
}
