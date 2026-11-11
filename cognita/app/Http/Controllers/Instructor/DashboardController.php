<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\BoardSessions;
use App\Services\ClassroomAccess;
use App\Support\HumanTime;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Instructor home: the teaching dashboard.
 *
 * It answers three questions in the order an instructor asks them as they open
 * the app: *is anything live right now*, *what do I teach* (courses, classes,
 * keys, rosters), and *what happened lately* (who joined, who turned up). Every
 * card links into the page that continues the job — the call, the register, the
 * class record — so the dashboard is a place to start, never a dead end.
 *
 * Nothing here is computed per card: one query feeds the live flags, one feeds
 * the "in the call" counts, one feeds the activity feed.
 */
class DashboardController extends Controller
{
    public function __invoke(
        ClassroomAccess $access,
        BoardSessions $rooms,
        AttendanceTracker $attendance,
    ): Response {
        /** @var User $instructor */
        $instructor = request()->user();

        $classrooms = $access->forInstructor($instructor);
        $classroomIds = $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();

        $liveIds = $rooms->liveAmong($classroomIds);
        $inCall = $attendance->presentNowByClassroom($classroomIds);
        $history = $this->roomHistory($classroomIds);

        $courses = $instructor->courses()
            ->withCount('classrooms')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('Instructor/Dashboard', [
            'stats' => [
                'live_classes' => count($liveIds),
                'in_call' => array_sum($inCall),
                'classes' => $classrooms->count(),
                'students' => (int) $classrooms->sum('enrollments_count'),
                'unassigned' => $classrooms->whereNull('course_id')->count(),
                'rooms_this_week' => $this->roomsThisWeek($classroomIds),
            ],
            'courses' => $courses
                ->map(fn ($course): array => [
                    'id' => (int) $course->getKey(),
                    'title' => $course->title,
                    'description' => $course->description,
                    'classrooms_count' => (int) $course->classrooms_count,
                    'students' => (int) $classrooms
                        ->where('course_id', (int) $course->getKey())
                        ->sum('enrollments_count'),
                ])
                ->values()
                ->all(),
            'classrooms' => $classrooms
                ->map(fn (Classroom $classroom): array => [
                    'id' => (int) $classroom->getKey(),
                    'name' => $classroom->name,
                    'join_code' => $classroom->join_code,
                    'course' => $classroom->course?->title,
                    'members' => (int) $classroom->enrollments_count,
                    'live' => in_array((int) $classroom->getKey(), $liveIds, true),
                    'in_call' => (int) ($inCall[(int) $classroom->getKey()] ?? 0),
                    'last_session' => $this->lastSessionLabel($classroom, $liveIds, $history),
                    'call_url' => route('call.show', ['classroom' => $classroom->getKey()]),
                    'class_url' => route('instructor.classes.show', ['classroom' => $classroom->getKey()]),
                    'attendance_url' => route('instructor.classes.attendance', [
                        'classroom' => $classroom->getKey(),
                    ]),
                ])
                ->values()
                ->all(),
            'activity' => $this->activity($classroomIds),
        ]);
    }

    /**
     * The last time each class had a room open, and how many rooms it has held.
     *
     * One grouped query instead of one lookup per card: the dashboard shows the
     * answer on every class tile.
     *
     * @param  list<int>  $classroomIds
     * @return Collection<int, object{classroom_id: int, last_seen_at: string, rooms: int}>
     */
    private function roomHistory(array $classroomIds): Collection
    {
        if ($classroomIds === []) {
            return collect();
        }

        return CallSession::query()
            ->whereIn('classroom_id', $classroomIds)
            ->groupBy('classroom_id')
            ->selectRaw('classroom_id, max(last_seen_at) as last_seen_at, count(*) as rooms')
            ->toBase()
            ->get()
            ->keyBy(static fn (object $row): int => (int) $row->classroom_id);
    }

    /** @param  list<int>  $classroomIds */
    private function roomsThisWeek(array $classroomIds): int
    {
        if ($classroomIds === []) {
            return 0;
        }

        return CallSession::query()
            ->whereIn('classroom_id', $classroomIds)
            ->where('created_at', '>=', now()->subDays(7))
            ->count();
    }

    /**
     * @param  list<int>  $liveIds
     * @param  Collection<int, object{classroom_id: int, last_seen_at: string, rooms: int}>  $history
     */
    private function lastSessionLabel(Classroom $classroom, array $liveIds, Collection $history): string
    {
        if (in_array((int) $classroom->getKey(), $liveIds, true)) {
            return 'Room is open';
        }

        $row = $history->get((int) $classroom->getKey());

        if ($row === null) {
            return 'Not opened yet';
        }

        return 'Last open '.HumanTime::ago(Carbon::parse((string) $row->last_seen_at));
    }

    /**
     * A short feed of what actually happened in these classes: students joining
     * a call, and students joining a class with a key.
     *
     * @param  list<int>  $classroomIds
     * @return list<array{id: string, kind: string, title: string, meta: string, at: string, href: string}>
     */
    private function activity(array $classroomIds): array
    {
        if ($classroomIds === []) {
            return [];
        }

        $joinedCalls = AttendanceRecord::query()
            ->whereIn('classroom_id', $classroomIds)
            ->with(['student:id,name', 'classroom:id,name'])
            ->latest('joined_at')
            ->limit(6)
            ->get()
            ->map(fn (AttendanceRecord $record): array => [
                'id' => 'call-'.$record->getKey(),
                'kind' => 'call',
                'title' => ($record->student?->name ?? 'A student').' joined a call',
                'meta' => (string) $record->classroom?->name,
                'at' => HumanTime::ago($record->joined_at),
                'href' => route('instructor.classes.attendance', [
                    'classroom' => $record->classroom_id,
                    'date' => $record->attended_on?->toDateString(),
                ]),
                'weight' => $record->joined_at->getTimestamp(),
            ]);

        $joinedClasses = Enrollment::query()
            ->whereIn('classroom_id', $classroomIds)
            ->with(['student:id,name', 'classroom:id,name'])
            ->latest('joined_at')
            ->limit(4)
            ->get()
            ->map(fn (Enrollment $enrollment): array => [
                'id' => 'enrolment-'.$enrollment->getKey(),
                'kind' => 'enrolment',
                'title' => ($enrollment->student?->name ?? 'A student').' joined with a class key',
                'meta' => (string) $enrollment->classroom?->name,
                'at' => HumanTime::ago($enrollment->joined_at),
                'href' => route('instructor.classes.show', [
                    'classroom' => $enrollment->classroom_id,
                ]),
                'weight' => $enrollment->joined_at->getTimestamp(),
            ]);

        return $joinedCalls
            ->concat($joinedClasses)
            ->sortByDesc('weight')
            ->take(6)
            ->map(static fn (array $item): array => Arr::except($item, ['weight']))
            ->values()
            ->all();
    }
}
