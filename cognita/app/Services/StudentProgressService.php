<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Models\AnswerHistory;
use App\Models\PrivateClass;
use App\Models\StudentKcMastery;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Per-student mastery drill-down for an instructor.
 *
 * Reads `student_kc_mastery` (written by the KT engine) and derives attempt /
 * accuracy counters from `answer_history`. It never re-estimates mastery.
 */
class StudentProgressService
{
    public function __construct(private readonly ClassAccessService $access) {}

    /**
     * Per-KC mastery rows for one student.
     *
     * @return array{
     *     student: array{id:int,name:string,email:string|null},
     *     rows: list<array{kc_id:int, kc_name:string|null, mastery_probability:float, model_used:string|null, last_updated:string|null, attempts:int, correct_rate:float}>
     * }
     */
    public function drillDown(User $instructor, int $studentId): array
    {
        $this->access->assertStudentInClass($instructor, $studentId);

        $student = User::query()->findOrFail($studentId);

        return [
            'student' => [
                'id' => (int) $student->getKey(),
                'name' => $student->name,
                'email' => $student->email,
            ],
            'rows' => $this->masteryRows($student),
        ];
    }

    /**
     * Per-class roster with each student's average mastery and at-risk flag.
     *
     * @return array{
     *     class: array{id:int,name:string},
     *     students: list<array{id:int, name:string, email:string|null, avg_mastery:float, at_risk:bool, kc_count:int}>
     * }
     */
    public function forClass(User $instructor, int $classId): array
    {
        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        return [
            'class' => [
                'id' => (int) $class->getKey(),
                'name' => $class->name,
            ],
            'students' => $this->classRoster($class),
        ];
    }

    /**
     * Aggregated per-KC mastery for a whole class.
     *
     * @return array{
     *     class: array{id:int,name:string},
     *     rows: list<array{kc_id:int, kc_name:string|null, avg_mastery:float, students_with_data:int}>
     * }
     */
    public function kcBreakdown(User $instructor, int $classId): array
    {
        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        $studentIds = $this->activeStudentIds($class);

        if ($studentIds->isEmpty()) {
            return [
                'class' => ['id' => (int) $class->getKey(), 'name' => $class->name],
                'rows' => [],
            ];
        }

        $masteries = StudentKcMastery::query()
            ->with('knowledgeComponent:id,name')
            ->whereIn('user_id', $studentIds->all())
            ->get();

        $rows = $masteries
            ->groupBy('knowledge_component_id')
            ->map(static function (Collection $group): array {
                /** @var StudentKcMastery $first */
                $first = $group->first();

                return [
                    'kc_id' => (int) $first->knowledge_component_id,
                    'kc_name' => $first->knowledgeComponent?->name,
                    'avg_mastery' => round((float) $group->avg(static fn (StudentKcMastery $m): float => (float) $m->mastery_probability), 4),
                    'students_with_data' => $group->count(),
                ];
            })
            ->sortBy('kc_id')
            ->values()
            ->all();

        return [
            'class' => ['id' => (int) $class->getKey(), 'name' => $class->name],
            'rows' => $rows,
        ];
    }

    /**
     * @return list<array{kc_id:int, kc_name:string|null, mastery_probability:float, model_used:string|null, last_updated:string|null, attempts:int, correct_rate:float}>
     */
    private function masteryRows(User $student): array
    {
        $threshold = (float) config('features.at_risk_threshold');

        $masteries = StudentKcMastery::query()
            ->with('knowledgeComponent:id,name')
            ->forUser($student)
            ->orderBy('knowledge_component_id')
            ->get();

        $attemptStats = $this->attemptStatistics($student);

        return $masteries
            ->map(static function (StudentKcMastery $mastery) use ($attemptStats, $threshold): array {
                $kcId = (int) $mastery->knowledge_component_id;
                $stats = $attemptStats->get($kcId, ['attempts' => 0, 'correct' => 0]);
                $attempts = (int) $stats['attempts'];
                $correct = (int) $stats['correct'];

                return [
                    'kc_id' => $kcId,
                    'kc_name' => $mastery->knowledgeComponent?->name,
                    'mastery_probability' => round((float) $mastery->mastery_probability, 4),
                    'model_used' => $mastery->model_used?->value,
                    'last_updated' => $mastery->last_updated?->toIso8601String(),
                    'attempts' => $attempts,
                    'correct_rate' => $attempts === 0 ? 0.0 : round($correct / $attempts, 4),
                    'at_risk' => (float) $mastery->mastery_probability < $threshold,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Attempt counters keyed by knowledge component id.
     *
     * @return Collection<int, array{attempts:int, correct:int}>
     */
    private function attemptStatistics(User $student): Collection
    {
        $rows = AnswerHistory::query()
            ->where('user_id', $student->getKey())
            ->whereNotNull('knowledge_component_id')
            ->groupBy('knowledge_component_id')
            ->selectRaw('knowledge_component_id, COUNT(*) as attempts, SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct')
            ->get();

        $stats = new Collection;

        foreach ($rows as $row) {
            /** @var AnswerHistory $row */
            $stats->put((int) $row->knowledge_component_id, [
                'attempts' => (int) $row->getAttribute('attempts'),
                'correct' => (int) $row->getAttribute('correct'),
            ]);
        }

        return $stats;
    }

    /**
     * @return list<array{id:int, name:string, email:string|null, avg_mastery:float, at_risk:bool, kc_count:int}>
     */
    private function classRoster(PrivateClass $class): array
    {
        $threshold = (float) config('features.at_risk_threshold');

        $studentIds = $this->activeStudentIds($class);

        if ($studentIds->isEmpty()) {
            return [];
        }

        $students = User::query()
            ->whereIn('id', $studentIds->all())
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name', 'display_name', 'email']);

        $masteries = StudentKcMastery::query()
            ->whereIn('user_id', $studentIds->all())
            ->get(['user_id', 'knowledge_component_id', 'mastery_probability']);

        $grouped = $masteries->groupBy(static fn (StudentKcMastery $m): int => (int) $m->user_id);

        return $students
            ->map(static function (User $student) use ($grouped, $threshold): array {
                /** @var Collection<int, StudentKcMastery> $own */
                $own = $grouped->get((int) $student->getKey(), new Collection);

                $probabilities = $own->map(static fn (StudentKcMastery $m): float => (float) $m->mastery_probability);

                return [
                    'id' => (int) $student->getKey(),
                    'name' => $student->displayLabel(),
                    'email' => $student->email,
                    'avg_mastery' => $probabilities->isEmpty() ? 0.0 : round((float) $probabilities->avg(), 4),
                    'at_risk' => $probabilities->contains(static fn (float $p): bool => $p < $threshold),
                    'kc_count' => $own->count(),
                ];
            })
            ->values()
            ->all();
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
}
