<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Enums\CourseStatus;
use App\Enums\LessonProgressStatus;
use App\Enums\LessonStatus;
use App\Enums\LiveSessionStatus;
use App\Http\Controllers\Controller;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** The self-paced side of a student's courses: outline, lessons and progress. */
class CourseController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $student */
        $student = $request->user();

        $courses = Course::query()
            ->where('status', CourseStatus::Published)
            ->with(['instructor:id,name', 'sections.lessons' => fn ($query) => $query->where('status', LessonStatus::Published)])
            ->withCount(['sections', 'lessons'])
            ->orderBy('title')
            ->get();

        $enrolledCourseIds = Classroom::query()
            ->whereNotNull('course_id')
            ->whereHas('enrollments', fn ($query) => $query->where('student_id', $student->getKey()))
            ->pluck('course_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $progressRows = LessonProgress::query()
            ->where('user_id', $student->getKey())
            ->get(['lesson_id', 'status'])
            ->keyBy('lesson_id');

        $rows = $courses
            ->map(static function (Course $course) use ($student, $enrolledCourseIds, $progressRows): array {
                $lessonIds = $course->sections->flatMap->lessons->pluck('id');
                $completed = $lessonIds->filter(
                    static fn ($id): bool => $progressRows->get($id)?->isCompleted() === true,
                )->count();
                $total = $lessonIds->count();
                $enrolled = in_array((int) $course->getKey(), $enrolledCourseIds, true);
                $nextLesson = $course->sections
                    ->flatMap->lessons
                    ->first(fn (Lesson $lesson): bool => $progressRows->get($lesson->getKey())?->isCompleted() !== true);

                $owned = (int) $course->instructor_id === (int) $student->getKey();

                return [
                    'id' => (int) $course->getKey(),
                    'title' => $course->title,
                    'description' => $course->description,
                    'instructor' => $course->instructor?->name,
                    'sections_count' => (int) $course->sections_count,
                    'lessons_count' => (int) $course->lessons_count,
                    'is_paid' => $course->requiresPayment(),
                    'price_label' => $course->requiresPayment() ? $course->priceLabel() : null,
                    'enrolled' => $enrolled,
                    'owned' => $owned,
                    'progress' => [
                        'completed' => $enrolled ? $completed : 0,
                        'total' => $total,
                        'percent' => $enrolled && $total > 0 ? (int) round($completed / $total * 100) : 0,
                    ],
                    'continue_url' => ($enrolled || $owned) && $nextLesson !== null
                        ? route('community.lessons.show', ['lesson' => $nextLesson->getKey()])
                        : null,
                    'url' => route('community.courses.show', ['course' => $course->getKey()]),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Student/Courses', [
            'courses' => $rows,
            'explore' => array_values(array_filter(
                $rows,
                static fn (array $row): bool => ! $row['owned'] && ! $row['enrolled'],
            )),
            'mine' => array_values(array_filter(
                $rows,
                static fn (array $row): bool => $row['owned'] || $row['enrolled'],
            )),
        ]);
    }

    public function show(Request $request, Course $course): Response
    {
        $this->authorize('view', $course);

        /** @var User $student */
        $student = $request->user();

        $enrollment = Enrollment::query()
            ->where('student_id', $student->getKey())
            ->whereHas('classroom', fn ($query) => $query->where('course_id', $course->getKey()))
            ->first();
        $enrolled = $enrollment !== null;
        $owned = (int) $course->instructor_id === (int) $student->getKey();
        $hasAccess = Gate::forUser($student)->allows('viewContent', $course);
        $accessReason = $hasAccess || $owned
            ? null
            : ($enrolled ? 'payment' : 'enroll');

        $course->load([
            'sections.lessons' => fn ($query) => $query->where('status', LessonStatus::Published),
        ]);

        $lessonIds = $course->sections->flatMap(fn ($section) => $section->lessons->pluck('id'))->all();
        $progress = LessonProgress::query()
            ->where('user_id', $student->getKey())
            ->whereIn('lesson_id', $lessonIds)
            ->get()
            ->keyBy('lesson_id');

        $completed = $progress->filter(fn (LessonProgress $row): bool => $row->isCompleted())->count();
        $total = count($lessonIds);
        $continueLesson = $course->sections
            ->flatMap->lessons
            ->first(fn (Lesson $lesson): bool => ! $progress->get($lesson->getKey())?->isCompleted());

        return Inertia::render('Student/Course', [
            'enrolled' => $enrolled,
            'owned' => $owned,
            'can_access' => $hasAccess || $owned,
            'access_reason' => $accessReason,
            'payment' => [
                'required' => $course->requiresPayment(),
                'price_label' => $course->requiresPayment() ? $course->priceLabel() : null,
                'instructions' => $course->payment_instructions,
                'payment_url' => $course->payment_url,
                'status' => $enrollment?->payment_status->value ?? null,
            ],
            'course' => [
                'id' => (int) $course->getKey(),
                'title' => $course->title,
                'description' => $course->description,
                'instructor' => $course->instructor?->name,
                'is_paid' => $course->requiresPayment(),
                'price_label' => $course->requiresPayment() ? $course->priceLabel() : null,
                'url' => route('community.courses.show', ['course' => $course->getKey()]),
            ],
            'progress' => [
                'completed' => $hasAccess ? $completed : 0,
                'total' => $hasAccess ? $total : 0,
                'percent' => $hasAccess && $total > 0 ? (int) round($completed / $total * 100) : 0,
                'continue_url' => $hasAccess && $continueLesson !== null
                    ? route('community.lessons.show', ['lesson' => $continueLesson->getKey()])
                    : null,
            ],
            'sections' => $hasAccess
                ? $course->sections
                    ->map(fn ($section): array => [
                        'id' => (int) $section->getKey(),
                        'title' => $section->title,
                        'description' => $section->description,
                        'lessons' => $section->lessons
                            ->map(fn (Lesson $lesson): array => [
                                'id' => (int) $lesson->getKey(),
                                'title' => $lesson->title,
                                'type' => $lesson->type->value,
                                'type_label' => $lesson->type->label(),
                                'duration_minutes' => $lesson->duration_minutes,
                                'progress' => $progress->get($lesson->getKey())?->status->value ?? LessonProgressStatus::NotStarted->value,
                                'completed' => (bool) $progress->get($lesson->getKey())?->isCompleted(),
                                'url' => route('community.lessons.show', ['lesson' => $lesson->getKey()]),
                            ])
                            ->values()
                            ->all(),
                    ])
                    ->values()
                    ->all()
                : [],
            'sessions' => $hasAccess ? $this->sessions($course) : [],
        ]);
    }

    public function lesson(Request $request, Lesson $lesson): Response
    {
        $this->authorize('view', $lesson);

        /** @var User $student */
        $student = $request->user();

        $lesson->load(['section.course', 'materials']);

        $course = $lesson->section?->course;
        abort_if($course === null, 404);

        $progress = LessonProgress::query()->firstOrCreate(
            ['user_id' => $student->getKey(), 'lesson_id' => $lesson->getKey()],
            ['status' => LessonProgressStatus::InProgress, 'last_viewed_at' => now()],
        );

        if ($progress->status === LessonProgressStatus::NotStarted) {
            $progress->forceFill([
                'status' => LessonProgressStatus::InProgress,
                'last_viewed_at' => now(),
            ])->save();
        } else {
            $progress->forceFill(['last_viewed_at' => now()])->save();
        }

        $ordered = $this->orderedLessons($course);
        $index = $ordered->search(fn (Lesson $item): bool => (int) $item->getKey() === (int) $lesson->getKey());
        $previous = $index !== false && $index > 0 ? $ordered->get($index - 1) : null;
        $next = $index !== false ? $ordered->get($index + 1) : null;

        return Inertia::render('Student/Lesson', [
            'lesson' => [
                'id' => (int) $lesson->getKey(),
                'title' => $lesson->title,
                'type' => $lesson->type->value,
                'type_label' => $lesson->type->label(),
                'content' => $lesson->content,
                'video_url' => $lesson->video_url,
                'duration_minutes' => $lesson->duration_minutes,
                'section' => $lesson->section?->title,
                'course' => [
                    'id' => (int) $course->getKey(),
                    'title' => $course->title,
                    'url' => route('community.courses.show', ['course' => $course->getKey()]),
                ],
                'materials' => $this->materials($lesson->materials),
                'progress' => $progress->status->value,
                'completed' => $progress->isCompleted(),
                'completed_at' => $progress->completed_at?->toDateString(),
            ],
            'previous' => $previous === null ? null : [
                'id' => (int) $previous->getKey(),
                'title' => $previous->title,
                'url' => route('community.lessons.show', ['lesson' => $previous->getKey()]),
            ],
            'next' => $next === null ? null : [
                'id' => (int) $next->getKey(),
                'title' => $next->title,
                'url' => route('community.lessons.show', ['lesson' => $next->getKey()]),
            ],
        ]);
    }

    public function progress(Request $request, Lesson $lesson): JsonResponse|RedirectResponse
    {
        $this->authorize('track', $lesson);

        /** @var User $student */
        $student = $request->user();

        /** @var array{status: string, watched_seconds?: int|null} $data */
        $data = $request->validate([
            'status' => ['required', Rule::in([
                LessonProgressStatus::InProgress->value,
                LessonProgressStatus::Completed->value,
            ])],
            'watched_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
        ]);

        $status = LessonProgressStatus::from($data['status']);

        $progress = LessonProgress::query()->updateOrCreate(
            ['user_id' => $student->getKey(), 'lesson_id' => $lesson->getKey()],
            [
                'status' => $status,
                'watched_seconds' => (int) ($data['watched_seconds'] ?? 0),
                'last_viewed_at' => now(),
                'completed_at' => $status->isCompleted() ? now() : null,
            ],
        );

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'data' => [
                    'status' => $progress->status->value,
                    'completed' => $progress->isCompleted(),
                    'completed_at' => $progress->completed_at?->toIso8601String(),
                ],
            ]);
        }

        return back()->with('success', $status->isCompleted() ? 'Lesson marked complete.' : 'Lesson progress saved.');
    }

    /**
     * @param  Collection<int, CourseMaterial>  $materials
     * @return list<array<string, mixed>>
     */
    private function materials(Collection $materials): array
    {
        return $materials
            ->map(static fn (CourseMaterial $material): array => [
                ...$material->reference(),
                'lesson_id' => (int) $material->lesson_id,
            ])
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function sessions(Course $course): array
    {
        return CallSession::query()
            ->with(['classroom:id,name', 'lesson:id,title'])
            ->where(fn ($query) => $query
                ->where('course_id', $course->getKey())
                ->orWhereHas('classroom', fn ($inner) => $inner->where('course_id', $course->getKey())))
            ->whereIn('status', [LiveSessionStatus::Scheduled, LiveSessionStatus::Live])
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()->subHour()))
            ->orderBy('starts_at')
            ->orderBy('id')
            ->limit(8)
            ->get()
            ->map(fn (CallSession $session): array => [
                'id' => (int) $session->getKey(),
                'title' => $session->title ?? 'Live class',
                'description' => $session->description,
                'lesson' => $session->lesson?->title,
                'classroom' => $session->classroom?->name,
                'state' => $session->state(),
                'starts_at' => $session->starts_at?->toIso8601String(),
                'ends_at' => $session->ends_at?->toIso8601String(),
                'join_url' => route('call.show', ['classroom' => $session->classroom_id]),
            ])
            ->values()
            ->all();
    }

    /** @return Collection<int, Lesson> */
    private function orderedLessons(Course $course): Collection
    {
        $course->load(['sections.lessons' => fn ($query) => $query->where('status', LessonStatus::Published)]);

        return $course->sections->flatMap->lessons->values();
    }
}
