<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnswerHistory;
use App\Models\ClassCourseAssignment;
use App\Models\PrivateClass;
use App\Models\User;
use App\Services\AnnouncementService;
use App\Services\AtRiskDetectionService;
use App\Services\ClassAccessService;
use App\Services\ClassBriefingAgent;
use App\Services\ClassDashboardService;
use App\Services\CohortAnalyticsService;
use App\Services\ContentAssignmentService;
use App\Services\LiveCallService;
use App\Services\StudentProgressService;
use BackedEnum;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The class console: roster mastery, at-risk students, content assignment,
 * announcements, invitations and the AI briefing.
 *
 * The class id is resolved through ClassAccessService (never implicit model
 * binding), so a foreign class is a 403 and a missing one a 404 before any
 * payload is built. Mastery figures are read from the rows the KT engine
 * wrote; the console never estimates them. The briefing is a deferred prop so
 * the LLM call, or its rule-based fallback, never blocks the first paint.
 */
class ClassController extends Controller
{
    public function __construct(
        private readonly ClassAccessService $access,
        private readonly ClassDashboardService $dashboard,
        private readonly StudentProgressService $progress,
        private readonly AtRiskDetectionService $atRisk,
        private readonly CohortAnalyticsService $cohortAnalytics,
        private readonly ContentAssignmentService $assignments,
        private readonly AnnouncementService $announcements,
        private readonly ClassBriefingAgent $briefingAgent,
        private readonly LiveCallService $liveCalls,
    ) {}

    public function index(Request $request): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $classes = $this->access->classesFor($instructor);

        $courseCounts = $classes->isEmpty()
            ? []
            : $this->assignedCourseCounts($classes->pluck('id')->map(static fn (mixed $id): int => (int) $id)->all());

        return Inertia::render('Instructor/Classes/Index', [
            'classes' => $classes
                ->map(fn (PrivateClass $class): array => [
                    'id' => (int) $class->getKey(),
                    'name' => $class->name,
                    'description' => $class->description,
                    'join_code' => $class->join_code,
                    'status' => $this->statusValue($class),
                    'max_students' => (int) $class->max_students,
                    'active_students' => $this->access->activeStudentIdsForClass($class)->count(),
                    'assigned_courses_count' => $courseCounts[(int) $class->getKey()] ?? 0,
                ])
                ->values()
                ->all(),
            'kpis' => $this->dashboard->forInstructor($instructor)['kpis'],
        ]);
    }

    public function show(Request $request, int $class): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $model = $this->access->assertInstructorOwnsClass($instructor, $class);

        $classKpis = $this->dashboard->forClass($instructor, $class);

        $activity = $this->activityByStudent($model);

        $students = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'display_label' => (string) $row['name'],
            'email' => $row['email'],
            'avg_mastery' => (float) $row['avg_mastery'],
            'at_risk' => (bool) $row['at_risk'],
            'attempts' => $activity['attempts'][(int) $row['id']] ?? 0,
            'last_activity' => $activity['latest'][(int) $row['id']] ?? null,
        ], $this->progress->forClass($instructor, $class)['students']);

        return Inertia::render('Instructor/Classes/Show', [
            'class' => [
                'id' => (int) $model->getKey(),
                'name' => $model->name,
                'description' => $model->description,
                'join_code' => $model->join_code,
                'status' => $this->statusValue($model),
                'max_students' => (int) $model->max_students,
                'active_students' => (int) $classKpis['active_students'],
                'created_at' => $model->created_at?->toIso8601String(),
            ],
            'kpis' => [
                'active_students' => (int) $classKpis['active_students'],
                'students' => (int) $classKpis['students'],
                'avg_mastery' => (float) $classKpis['avg_mastery'],
                'at_risk_count' => (int) $classKpis['at_risk_count'],
                'assigned_courses_count' => count($classKpis['assigned_courses']),
            ],
            'students' => $students,
            'atRisk' => $this->atRisk->atRiskStudents($instructor, $class),
            'announcements' => $this->announcements
                ->forClass($instructor, $class)
                ->take(10)
                ->map(static fn (Announcement $announcement): array => [
                    'id' => (int) $announcement->getKey(),
                    'title' => $announcement->title,
                    'body' => $announcement->body,
                    'published_at' => $announcement->published_at?->toIso8601String(),
                    'instructor' => $announcement->instructor?->displayLabel(),
                ])
                ->values()
                ->all(),
            'assignedCourses' => $classKpis['assigned_courses'],
            'courses' => $this->assignments
                ->assignableCourses()
                ->map(static fn ($course): array => [
                    'id' => (int) $course->getKey(),
                    'title' => (string) $course->title,
                ])
                ->values()
                ->all(),
            'lessonOptions' => $this->lessonOptions(),
            'latestSnapshot' => $this->latestSnapshot($model),
            'briefing' => Inertia::defer(fn (): array => $this->briefingAgent->briefing($instructor, $class)),
            'capabilities' => [
                'can_announce' => true,
                'can_assign' => true,
                'can_invite' => true,
                'can_snapshot' => true,
                'can_live_call' => $this->liveCalls->enabled() && $this->liveCalls->configured(),
            ],
        ]);
    }

    /**
     * Assignable lessons grouped by course, so the student-lesson form can
     * narrow the lesson list once a course is picked.
     *
     * @return list<array{course_id:int, course_title:string, lessons:list<array{id:int, title:string}>}>
     */
    private function lessonOptions(): array
    {
        $options = [];

        foreach ($this->assignments->assignableCourses() as $course) {
            $lessons = $this->assignments
                ->assignableLessons($course)
                ->map(static fn ($lesson): array => [
                    'id' => (int) $lesson->getKey(),
                    'title' => (string) $lesson->title,
                ])
                ->values()
                ->all();

            if ($lessons === []) {
                continue;
            }

            $options[] = [
                'course_id' => (int) $course->getKey(),
                'course_title' => (string) $course->title,
                'lessons' => $lessons,
            ];
        }

        return $options;
    }

    /**
     * Attempt count and most recent answer per active student, for the roster
     * columns. Derived from `answer_history`; mastery rows are not touched.
     *
     * @return array{attempts:array<int, int>, latest:array<int, string|null>}
     */
    private function activityByStudent(PrivateClass $class): array
    {
        $studentIds = $this->access->activeStudentIdsForClass($class)->all();

        if ($studentIds === []) {
            return ['attempts' => [], 'latest' => []];
        }

        $rows = AnswerHistory::query()
            ->whereIn('user_id', $studentIds)
            ->groupBy('user_id')
            ->selectRaw('user_id, COUNT(*) as attempts, MAX(created_at) as last_attempt')
            ->get();

        $attempts = [];
        $latest = [];

        foreach ($rows as $row) {
            $studentId = (int) $row->user_id;
            $attempts[$studentId] = (int) $row->getAttribute('attempts');
            $lastAttempt = $row->getAttribute('last_attempt');
            $latest[$studentId] = $lastAttempt === null ? null : (string) $lastAttempt;
        }

        return ['attempts' => $attempts, 'latest' => $latest];
    }

    /**
     * Assigned courses per class, keyed by class id.
     *
     * @param  list<int>  $classIds
     * @return array<int, int>
     */
    private function assignedCourseCounts(array $classIds): array
    {
        return ClassCourseAssignment::query()
            ->whereIn('class_id', $classIds)
            ->groupBy('class_id')
            ->selectRaw('class_id, COUNT(*) as total')
            ->pluck('total', 'class_id')
            ->map(static fn (mixed $total): int => (int) $total)
            ->all();
    }

    /**
     * @return array{id:int, snapshot_date:string|null, created_at:string|null}|null
     */
    private function latestSnapshot(PrivateClass $class): ?array
    {
        $snapshot = $this->cohortAnalytics->latestSnapshot($class);

        if ($snapshot === null) {
            return null;
        }

        return [
            'id' => (int) $snapshot->getKey(),
            'snapshot_date' => $snapshot->snapshot_date?->toDateString(),
            'created_at' => $snapshot->created_at?->toIso8601String(),
        ];
    }

    private function statusValue(PrivateClass $class): string
    {
        return $class->status instanceof BackedEnum
            ? (string) $class->status->value
            : (string) $class->status;
    }
}
