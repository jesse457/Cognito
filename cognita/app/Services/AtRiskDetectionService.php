<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassEnrollment;
use App\Models\PrivateClass;
use App\Models\StudentKcMastery;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * At-risk detection for the instructor portal.
 *
 * A student is "at risk" when the KT engine has recorded a mastery probability
 * below `features.at_risk_threshold` on at least one knowledge component. The
 * service only reads those rows; it never estimates mastery itself.
 *
 * `flagStudent()` is called by the MasteryDropped listener. It deliberately
 * writes **no** admin audit row (instructors are not staff) and is a no-op with
 * zero queries while the feature flag is off.
 */
class AtRiskDetectionService
{
    public function __construct(private readonly ClassAccessService $access) {}

    /**
     * At-risk students, optionally narrowed to one class.
     *
     * @return list<array{
     *     student_id:int,
     *     student_name:string,
     *     student_email:string|null,
     *     class_id:int|null,
     *     lowest_mastery:float,
     *     at_risk_kc_count:int,
     *     kc_ids:list<int>
     * }>
     */
    public function atRiskStudents(User $instructor, ?int $classId = null): array
    {
        if (! $this->access->portalEnabled()) {
            return [];
        }

        $class = $classId === null
            ? null
            : $this->access->assertInstructorOwnsClass($instructor, $classId);

        $studentIds = $class === null
            ? $this->access->activeStudentIdsFor($instructor)
            : $this->access->activeStudentIdsForClass($class);

        if ($studentIds->isEmpty()) {
            return [];
        }

        $threshold = (float) config('features.at_risk_threshold');

        $rows = StudentKcMastery::query()
            ->whereIn('user_id', $studentIds->all())
            ->where('mastery_probability', '<', $threshold)
            ->get(['user_id', 'knowledge_component_id', 'mastery_probability']);

        if ($rows->isEmpty()) {
            return [];
        }

        $names = User::query()
            ->whereIn('id', $rows->pluck('user_id')->map(static fn (mixed $id): int => (int) $id)->unique()->all())
            ->get(['id', 'name', 'display_name', 'email'])
            ->keyBy(static fn (User $user): int => (int) $user->getKey());

        $grouped = $rows->groupBy(static fn (StudentKcMastery $m): int => (int) $m->user_id);

        return $grouped
            ->map(static function (Collection $group, int|string $studentId) use ($names): array {
                /** @var StudentKcMastery $first */
                $first = $group->first();
                /** @var User|null $student */
                $student = $names->get((int) $studentId);

                return [
                    'student_id' => (int) $studentId,
                    'student_name' => $student?->displayLabel() ?? "Student #{$studentId}",
                    'student_email' => $student?->email,
                    'class_id' => null,
                    'lowest_mastery' => round((float) $group->min(static fn (StudentKcMastery $m): float => (float) $m->mastery_probability), 4),
                    'at_risk_kc_count' => $group->count(),
                    'kc_ids' => $group
                        ->pluck('knowledge_component_id')
                        ->map(static fn (mixed $id): int => (int) $id)
                        ->sort()
                        ->values()
                        ->all(),
                ];
            })
            ->sortBy('lowest_mastery')
            ->values()
            ->all();
    }

    /**
     * Flag a single student after a mastery drop.
     *
     * Writes no admin audit row; emits one structured log line so operators can
     * trace why a student appeared in the teacher's at-risk list.
     */
    public function flagStudent(User $student): void
    {
        if (! $this->access->portalEnabled()) {
            return;
        }

        $threshold = (float) config('features.at_risk_threshold');

        $lowest = StudentKcMastery::query()
            ->forUser($student)
            ->min('mastery_probability');

        $isAtRisk = $lowest !== null && (float) $lowest < $threshold;

        Log::warning('instructor.at_risk.flagged', [
            'event' => 'instructor.at_risk.flagged',
            'student_id' => (int) $student->getKey(),
            'threshold' => $threshold,
            'lowest_mastery' => $lowest === null ? null : round((float) $lowest, 4),
            'at_risk' => $isAtRisk,
            'class_ids' => $this->instructorClassIds($student),
        ]);
    }

    /**
     * Ids of the active classes (and their instructors) the student belongs to.
     *
     * @return list<int>
     */
    private function instructorClassIds(User $student): array
    {
        return ClassEnrollment::query()
            ->where('student_id', $student->getKey())
            ->where('status', EnrollmentStatus::Active->value)
            ->whereIn('class_id', PrivateClass::query()
                ->where('status', ClassStatus::Active->value)
                ->select('id'))
            ->pluck('class_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->unique()
            ->values()
            ->all();
    }
}
