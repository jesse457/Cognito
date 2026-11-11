<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\BoardSessions;
use App\Services\ClassroomAccess;
use App\Support\HumanTime;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student home: a dashboard of the classes this student joined with a key.
 *
 * The key form stays at the top of the page because it is the one thing a
 * student arrives to do. Everything below it is orientation: which class is
 * live *right now*, how much time they have spent in class, when they were last
 * in a call, and the one-click way into each room.
 *
 * Attendance is automatic and read-only here — the same rows the instructor's
 * register shows, seen from the student's side.
 */
class HomeController extends Controller
{
    /** How far back the "recent attendance" history and session count look. */
    private const HISTORY_DAYS = 30;

    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly BoardSessions $rooms,
    ) {}

    public function index(Request $request): Response
    {
        /** @var User $student */
        $student = $request->user();

        $classrooms = $this->access->forStudent($student);
        $classroomIds = $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();

        $liveIds = $this->rooms->liveAmong($classroomIds);
        $history = $this->history($student, $classroomIds);
        $lastAttended = $this->lastAttended($student, $classroomIds);

        return Inertia::render('Student/Home', [
            'stats' => [
                'classes' => $classrooms->count(),
                'courses' => $classrooms->whereNotNull('course_id')->unique('course_id')->count(),
                'live' => count($liveIds),
                'in_call' => $history->filter(fn (AttendanceRecord $record): bool => $this->isPresent($record))->count(),
                'time_in_class' => HumanTime::duration($this->secondsSince($history, 7)),
                'sessions' => $history->count(),
            ],
            'courses' => $this->courses($classrooms, $liveIds),
            'classrooms' => $classrooms
                ->map(fn (Classroom $classroom): array => [
                    'id' => (int) $classroom->getKey(),
                    'name' => $classroom->name,
                    'join_code' => $classroom->join_code,
                    'course' => $classroom->course?->title,
                    'instructor' => $classroom->instructor?->name,
                    'members' => (int) $classroom->enrollments_count,
                    'live' => in_array((int) $classroom->getKey(), $liveIds, true),
                    'last_attended' => $this->lastAttendedLabel($lastAttended[(int) $classroom->getKey()] ?? null),
                    'call_url' => route('call.show', ['classroom' => $classroom->getKey()]),
                ])
                ->values()
                ->all(),
            'recent' => $this->recent($history),
        ]);
    }

    /**
     * The student's own attendance rows for the recent past, newest first.
     *
     * @param  list<int>  $classroomIds
     * @return Collection<int, AttendanceRecord>
     */
    private function history(User $student, array $classroomIds): Collection
    {
        if ($classroomIds === []) {
            return collect();
        }

        return AttendanceRecord::query()
            ->where('user_id', $student->getKey())
            ->whereIn('classroom_id', $classroomIds)
            ->where('attended_on', '>=', now()->subDays(self::HISTORY_DAYS - 1)->toDateString())
            ->with('classroom:id,name')
            ->orderByDesc('joined_at')
            ->get();
    }

    /**
     * The most recent day each class was attended, for the "last in class" line
     * on every class card. All-time, not just the history window.
     *
     * @param  list<int>  $classroomIds
     * @return array<int, string> classroom id => Y-m-d
     */
    private function lastAttended(User $student, array $classroomIds): array
    {
        if ($classroomIds === []) {
            return [];
        }

        return AttendanceRecord::query()
            ->where('user_id', $student->getKey())
            ->whereIn('classroom_id', $classroomIds)
            ->groupBy('classroom_id')
            ->selectRaw('classroom_id, max(attended_on) as last_on')
            ->toBase()
            ->get()
            ->mapWithKeys(static fn (object $row): array => [
                (int) $row->classroom_id => (string) $row->last_on,
            ])
            ->all();
    }

    /** Whether this record is in a call right now (open, heartbeated recently). */
    private function isPresent(AttendanceRecord $record): bool
    {
        $window = now()->subSeconds(AttendanceTracker::PRESENT_WINDOW_SECONDS);

        return $record->left_at === null
            && $record->last_seen_at !== null
            && $record->last_seen_at->getTimestamp() >= $window->getTimestamp();
    }

    /** Total seconds attended inside the last N days of the history window. */
    private function secondsSince(Collection $history, int $days): int
    {
        $from = now()->subDays($days - 1)->startOfDay();

        return (int) $history
            ->filter(static fn (AttendanceRecord $record): bool => $record->attended_on->greaterThanOrEqualTo($from))
            ->sum(static fn (AttendanceRecord $record): int => $record->seconds());
    }

    private function lastAttendedLabel(?string $date): string
    {
        if ($date === null) {
            return 'Not in a call yet';
        }

        $day = HumanTime::day(Carbon::parse($date));

        return match ($day) {
            'Today' => 'In the call today',
            'Yesterday' => 'Last in class yesterday',
            default => 'Last in class '.$day,
        };
    }

    /**
     * The courses this student is enrolled in through their classes.
     *
     * @param  Collection<int, Classroom>  $classrooms
     * @param  list<int>  $liveIds
     * @return list<array{id: int, title: string, classes: int, members: int, live: bool}>
     */
    private function courses(Collection $classrooms, array $liveIds): array
    {
        return $classrooms
            ->filter(static fn (Classroom $classroom): bool => $classroom->course !== null)
            ->groupBy(static fn (Classroom $classroom): int => (int) $classroom->course_id)
            ->map(static fn (Collection $group, int $courseId): array => [
                'id' => $courseId,
                'title' => (string) $group->first()->course?->title,
                'classes' => $group->count(),
                'members' => (int) $group->sum('enrollments_count'),
                'live' => $group->contains(
                    static fn (Classroom $classroom): bool => in_array((int) $classroom->getKey(), $liveIds, true),
                ),
            ])
            ->sortBy('title')
            ->values()
            ->all();
    }

    /**
     * The handful of latest call sessions, as the student experienced them.
     *
     * @param  Collection<int, AttendanceRecord>  $history
     * @return list<array{id: int, classroom: string, classroom_id: int, when: string, duration: string, live: bool, href: string}>
     */
    private function recent(Collection $history): array
    {
        $window = now()->subSeconds(AttendanceTracker::PRESENT_WINDOW_SECONDS);

        return $history
            ->take(5)
            ->map(static fn (AttendanceRecord $record): array => [
                'id' => (int) $record->getKey(),
                'classroom' => (string) $record->classroom?->name,
                'classroom_id' => (int) $record->classroom_id,
                'when' => HumanTime::dayAt($record->joined_at),
                'duration' => HumanTime::duration($record->seconds()),
                'live' => $record->left_at === null
                    && $record->last_seen_at !== null
                    && $record->last_seen_at->getTimestamp() >= $window->getTimestamp(),
                'href' => route('call.show', ['classroom' => $record->classroom_id]),
            ])
            ->values()
            ->all();
    }
}
