<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassCourseAssignment;
use App\Models\ClassEnrollment;
use App\Models\CohortAnalyticsSnapshot;
use App\Models\PrivateClass;
use App\Models\StudentContentAssignment;
use App\Models\StudentKcMastery;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Read-only KPI aggregation for the instructor portal.
 *
 * It never computes mastery: every number is derived from rows written by the
 * KT engine into `student_kc_mastery` plus simple membership counts. All class
 * access is resolved through ClassAccessService.
 */
class ClassDashboardService
{
    public function __construct(private readonly ClassAccessService $access) {}

    /**
     * Portal landing payload: the instructor's classes plus cross-class KPIs.
     *
     * @return array{
     *     kpis: array{classes:int, active_students:int, avg_mastery:float, at_risk_count:int},
     *     classes: list<array<string, mixed>>
     * }
     */
    public function forInstructor(User $instructor): array
    {
        if (! $this->access->portalEnabled()) {
            return [
                'kpis' => ['classes' => 0, 'active_students' => 0, 'avg_mastery' => 0.0, 'at_risk_count' => 0],
                'classes' => [],
            ];
        }

        $classes = $this->access->classesFor($instructor);

        $classIds = $classes->pluck('id')->map(static fn (mixed $id): int => (int) $id)->all();

        $activeStudentIds = $classIds === []
            ? new Collection
            : $this->activeStudentIdsForClasses($classIds);

        $threshold = (float) config('features.at_risk_threshold');

        $averageMastery = $activeStudentIds->isEmpty()
            ? 0.0
            : round((float) StudentKcMastery::query()
                ->whereIn('user_id', $activeStudentIds->all())
                ->avg('mastery_probability'), 4);

        $atRiskStudentIds = $activeStudentIds->isEmpty()
            ? new Collection
            : StudentKcMastery::query()
                ->whereIn('user_id', $activeStudentIds->all())
                ->where('mastery_probability', '<', $threshold)
                ->pluck('user_id')
                ->map(static fn (mixed $id): int => (int) $id)
                ->unique()
                ->values();

        $classesPayload = $classes
            ->map(fn (PrivateClass $class): array => $this->summariseClass($class, $threshold))
            ->values()
            ->all();

        return [
            'kpis' => [
                'classes' => $classes->count(),
                'active_students' => $activeStudentIds->count(),
                'avg_mastery' => $averageMastery,
                'at_risk_count' => $atRiskStudentIds->count(),
            ],
            'classes' => $classesPayload,
        ];
    }

    /**
     * Per-class KPI payload.
     *
     * @return array<string, mixed>
     */
    public function forClass(User $instructor, int $classId): array
    {
        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        $threshold = (float) config('features.at_risk_threshold');

        $activeStudentIds = $this->access->activeStudentIdsForClass($class);

        $totalStudents = $class->enrollments()->count();

        $averageMastery = $activeStudentIds->isEmpty()
            ? 0.0
            : round((float) StudentKcMastery::query()
                ->whereIn('user_id', $activeStudentIds->all())
                ->avg('mastery_probability'), 4);

        $atRiskStudentIds = $activeStudentIds->isEmpty()
            ? new Collection
            : StudentKcMastery::query()
                ->whereIn('user_id', $activeStudentIds->all())
                ->where('mastery_probability', '<', $threshold)
                ->pluck('user_id')
                ->map(static fn (mixed $id): int => (int) $id)
                ->unique()
                ->values();

        $assignedCourses = ClassCourseAssignment::query()
            ->with('course:id,title,status')
            ->where('class_id', $class->getKey())
            ->orderByDesc('assigned_at')
            ->orderByDesc('id')
            ->get()
            ->map(static fn (ClassCourseAssignment $assignment): array => [
                'id' => (int) $assignment->getKey(),
                'course_id' => (int) $assignment->course_id,
                'title' => $assignment->course?->title,
                'assigned_at' => $assignment->assigned_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $upcomingAssignments = StudentContentAssignment::query()
            ->with('lesson:id,title')
            ->where('class_id', $class->getKey())
            ->whereNotNull('due_at')
            ->where('due_at', '>=', now())
            ->orderBy('due_at')
            ->limit(10)
            ->get()
            ->map(static fn (StudentContentAssignment $assignment): array => [
                'id' => (int) $assignment->getKey(),
                'student_id' => (int) $assignment->student_id,
                'lesson_id' => (int) $assignment->lesson_id,
                'lesson_title' => $assignment->lesson?->title,
                'due_at' => $assignment->due_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $latestSnapshot = $class->analyticsSnapshots()
            ->orderByDesc('snapshot_date')
            ->orderByDesc('id')
            ->first();

        return [
            'class' => $this->summariseClass($class, $threshold),
            'students' => $totalStudents,
            'active_students' => $activeStudentIds->count(),
            'avg_mastery' => $averageMastery,
            'at_risk_count' => $atRiskStudentIds->count(),
            'at_risk_student_ids' => $atRiskStudentIds->all(),
            'assigned_courses' => $assignedCourses,
            'upcoming_assignments' => $upcomingAssignments,
            'latest_snapshot' => $this->snapshotPayload($latestSnapshot),
        ];
    }

    /**
     * Compact class representation shared by both payloads.
     *
     * @return array<string, mixed>
     */
    private function summariseClass(PrivateClass $class, float $threshold): array
    {
        $activeStudentIds = $this->access->activeStudentIdsForClass($class);

        $averageMastery = $activeStudentIds->isEmpty()
            ? 0.0
            : round((float) StudentKcMastery::query()
                ->whereIn('user_id', $activeStudentIds->all())
                ->avg('mastery_probability'), 4);

        return [
            'id' => (int) $class->getKey(),
            'name' => $class->name,
            'description' => $class->description,
            'join_code' => $class->join_code,
            'status' => $class->status instanceof ClassStatus ? $class->status->value : (string) $class->status,
            'max_students' => (int) $class->max_students,
            'active_students' => $activeStudentIds->count(),
            'avg_mastery' => $averageMastery,
            'at_risk_count' => $activeStudentIds->isEmpty()
                ? 0
                : StudentKcMastery::query()
                    ->whereIn('user_id', $activeStudentIds->all())
                    ->where('mastery_probability', '<', $threshold)
                    ->distinct()
                    ->count('user_id'),
            'created_at' => $class->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  list<int>  $classIds
     * @return Collection<int, int>
     */
    private function activeStudentIdsForClasses(array $classIds): Collection
    {
        return ClassEnrollment::query()
            ->whereIn('class_id', $classIds)
            ->where('status', EnrollmentStatus::Active->value)
            ->pluck('student_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->unique()
            ->values();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function snapshotPayload(?CohortAnalyticsSnapshot $snapshot): ?array
    {
        if ($snapshot === null) {
            return null;
        }

        return [
            'id' => (int) $snapshot->getKey(),
            'snapshot_date' => $snapshot->snapshot_date?->toDateString(),
            'metrics' => $snapshot->metrics ?? [],
        ];
    }
}
