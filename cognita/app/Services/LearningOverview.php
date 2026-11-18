<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CourseStatus;
use App\Enums\LessonProgressStatus;
use App\Enums\LessonStatus;
use App\Enums\LiveSessionStatus;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\User;

/** One place that turns a person's lessons and sessions into a progress view. */
class LearningOverview
{
    /** @return array{courses: list<array<string, mixed>>, tasks: list<array<string, mixed>>, stats: array<string, int>} */
    public function forStudent(User $student): array
    {
        $courseIds = Classroom::query()
            ->whereNotNull('course_id')
            ->whereHas('enrollments', fn ($query) => $query->where('student_id', $student->getKey()))
            ->pluck('course_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $courses = Course::query()
            ->whereIn('id', $courseIds)
            ->where('status', CourseStatus::Published)
            ->with(['sections.lessons' => fn ($query) => $query->where('status', LessonStatus::Published)])
            ->orderBy('title')
            ->get();

        $lessonIds = $courses
            ->flatMap(static fn (Course $course) => $course->sections->flatMap->lessons)
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $rows = $lessonIds === []
            ? collect()
            : LessonProgress::query()
                ->where('user_id', $student->getKey())
                ->whereIn('lesson_id', $lessonIds)
                ->get(['lesson_id', 'status'])
                ->keyBy('lesson_id');

        $overview = [];
        $tasks = [];
        $completedTotal = 0;
        $lessonTotal = 0;

        foreach ($courses as $course) {
            $lessons = $course->sections->flatMap->lessons;
            $completed = 0;
            $next = null;

            foreach ($lessons as $lesson) {
                $status = $rows->get($lesson->getKey())?->status ?? LessonProgressStatus::NotStarted;

                if ($status->isCompleted()) {
                    $completed++;
                } elseif ($status === LessonProgressStatus::InProgress) {
                    $tasks[] = [
                        'id' => (int) $lesson->getKey(),
                        'kind' => 'lesson',
                        'label' => $lesson->title,
                        'context' => $course->title,
                        'href' => route('community.lessons.show', ['lesson' => $lesson->getKey()]),
                    ];
                }

                $next ??= $status->isCompleted() ? null : $lesson;
            }

            $completedTotal += $completed;
            $lessonTotal += $lessons->count();

            $overview[] = [
                'id' => (int) $course->getKey(),
                'title' => $course->title,
                'completed' => $completed,
                'total' => $lessons->count(),
                'percent' => $lessons->count() > 0 ? (int) round($completed / $lessons->count() * 100) : 0,
                'href' => route('community.courses.show', ['course' => $course->getKey()]),
                'next_href' => $next === null
                    ? null
                    : route('community.lessons.show', ['lesson' => $next->getKey()]),
            ];

            if ($next !== null) {
                $tasks[] = [
                    'id' => -(int) $course->getKey(),
                    'kind' => 'course',
                    'label' => 'Continue '.$course->title,
                    'context' => $this->percentLabel($overview[array_key_last($overview)]),
                    'href' => route('community.lessons.show', ['lesson' => $next->getKey()]),
                ];
            }
        }

        foreach ($this->upcomingSessions($courseIds) as $session) {
            $tasks[] = $session;
        }

        return [
            'courses' => $overview,
            'tasks' => array_slice($tasks, 0, 8),
            'stats' => [
                'courses' => count($overview),
                'completed' => $completedTotal,
                'lessons' => $lessonTotal,
                'percent' => $lessonTotal > 0 ? (int) round($completedTotal / $lessonTotal * 100) : 0,
            ],
        ];
    }

    /** @return array{courses: list<array<string, mixed>>, tasks: list<array<string, mixed>>, stats: array<string, int>} */
    public function forInstructor(User $instructor): array
    {
        $courses = $instructor->courses()
            ->with(['sections.lessons'])
            ->orderBy('title')
            ->get();

        $overview = [];
        $published = 0;
        $total = 0;

        foreach ($courses as $course) {
            $lessons = $course->sections->flatMap->lessons;
            $ready = $lessons->filter(fn (Lesson $lesson): bool => $lesson->status === LessonStatus::Published)->count();

            $published += $ready;
            $total += $lessons->count();

            $overview[] = [
                'id' => (int) $course->getKey(),
                'title' => $course->title,
                'completed' => $ready,
                'total' => $lessons->count(),
                'percent' => $lessons->count() > 0 ? (int) round($ready / $lessons->count() * 100) : 0,
                'href' => route('instructor.courses.show', ['course' => $course->getKey()]),
                'next_href' => null,
            ];
        }

        $tasks = [];

        foreach ($this->upcomingSessions(
            $courses->pluck('id')->map(static fn ($id): int => (int) $id)->all(),
        ) as $session) {
            $tasks[] = $session;
        }

        return [
            'courses' => $overview,
            'tasks' => array_slice($tasks, 0, 8),
            'stats' => [
                'courses' => count($overview),
                'completed' => $published,
                'lessons' => $total,
                'percent' => $total > 0 ? (int) round($published / $total * 100) : 0,
            ],
        ];
    }

    /**
     * @param  list<int>  $courseIds
     * @return list<array<string, mixed>>
     */
    private function upcomingSessions(array $courseIds): array
    {
        if ($courseIds === []) {
            return [];
        }

        return CallSession::query()
            ->with('classroom:id,name')
            ->whereIn('status', [LiveSessionStatus::Scheduled, LiveSessionStatus::Live])
            ->where(function ($query) use ($courseIds): void {
                $query->whereIn('course_id', $courseIds)
                    ->orWhereHas('classroom', fn ($inner) => $inner->whereIn('course_id', $courseIds));
            })
            ->orderBy('starts_at')
            ->orderBy('id')
            ->limit(5)
            ->get()
            ->map(static fn (CallSession $session): array => [
                'id' => (int) $session->getKey() + 1000000,
                'kind' => 'call',
                'label' => $session->title ?? 'Live class',
                'context' => $session->classroom?->name ?? 'Class call',
                'href' => route('call.show', ['classroom' => $session->classroom_id]),
            ])
            ->all();
    }

    /** @param  array{percent: int}  $course */
    private function percentLabel(array $course): string
    {
        return $course['percent'].'% complete';
    }
}
