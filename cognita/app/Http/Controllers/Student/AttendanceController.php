<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\ClassroomAccess;
use App\Support\HumanTime;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student's attendance history: every call the tracker recorded for them,
 * grouped by class, with the running totals a student actually cares about.
 *
 * Attendance is read-only here for the same reason it is read-only for the
 * instructor: it is written by the call, not by hand.
 */
class AttendanceController extends Controller
{
    /** How far back the default history reaches. */
    private const HISTORY_DAYS = 90;

    public function __construct(
        private readonly ClassroomAccess $access,
    ) {}

    public function index(Request $request): Response
    {
        /** @var User $student */
        $student = $request->user();

        $classrooms = $this->access->forStudent($student);
        $ids = $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $classroomId = $request->integer('classroom') ?: null;

        if ($classroomId !== null && ! in_array($classroomId, $ids, true)) {
            $classroomId = null;
        }

        $records = AttendanceRecord::query()
            ->where('user_id', $student->getKey())
            ->whereIn('classroom_id', $ids)
            ->where('attended_on', '>=', now()->subDays(self::HISTORY_DAYS - 1)->toDateString())
            ->with('classroom:id,name')
            ->orderByDesc('joined_at')
            ->get();

        $filtered = $classroomId === null
            ? $records
            : $records->filter(static fn (AttendanceRecord $record): bool => (int) $record->classroom_id === $classroomId);

        $summary = $this->summary($filtered);

        return Inertia::render('Student/Attendance', [
            'filters' => [
                'classroom' => $classroomId,
                'days' => self::HISTORY_DAYS,
            ],
            'summary' => [
                ...$summary,
                'time_in_class' => HumanTime::duration($summary['seconds']),
                'streak' => $this->streak($filtered),
            ],
            'classrooms' => $classrooms
                ->map(function (Classroom $classroom) use ($records): array {
                    $own = $records->filter(
                        static fn (AttendanceRecord $record): bool => (int) $record->classroom_id === (int) $classroom->getKey(),
                    );
                    $totals = $this->summary($own);

                    return [
                        'id' => (int) $classroom->getKey(),
                        'name' => $classroom->name,
                        'join_code' => $classroom->join_code,
                        'course' => $classroom->course?->title,
                        'sessions' => $totals['sessions'],
                        'days' => $totals['days'],
                        'time_in_class' => HumanTime::duration($totals['seconds']),
                        'last_attended' => $this->lastAttendedLabel($totals['last_on']),
                        'last_on' => $totals['last_on'],
                    ];
                })
                ->values()
                ->all(),
            'sessions' => $filtered
                ->take(100)
                ->map(static fn (AttendanceRecord $record): array => [
                    'id' => (int) $record->getKey(),
                    'classroom' => (string) $record->classroom?->name,
                    'classroom_id' => (int) $record->classroom_id,
                    'when' => HumanTime::dayAt($record->joined_at),
                    'duration' => HumanTime::duration($record->seconds()),
                    'live' => $record->left_at === null
                        && $record->last_seen_at !== null
                        && $record->last_seen_at->getTimestamp() >= now()->subSeconds(AttendanceTracker::PRESENT_WINDOW_SECONDS)->getTimestamp(),
                    'href' => route('call.show', ['classroom' => $record->classroom_id]),
                    'class_url' => route('student.classes.show', ['classroom' => $record->classroom_id]),
                ])
                ->values()
                ->all(),
        ]);
    }

    /** @param  Collection<int, AttendanceRecord>  $records */
    private function summary(Collection $records): array
    {
        return [
            'sessions' => $records->count(),
            'days' => $records->pluck('attended_on')->map(static fn ($day): string => $day->toDateString())->unique()->count(),
            'seconds' => (int) $records->sum(static fn (AttendanceRecord $record): int => $record->seconds()),
            'last_on' => $records->sortByDesc('attended_on')->first()?->attended_on?->toDateString(),
        ];
    }

    /**
     * Consecutive days ending today (or yesterday, so a streak survives until
     * the end of the day a student has not joined yet).
     *
     * @param  Collection<int, AttendanceRecord>  $records
     */
    private function streak(Collection $records): int
    {
        $days = $records
            ->pluck('attended_on')
            ->map(static fn ($day): string => $day->toDateString())
            ->unique()
            ->sortDesc()
            ->values();

        if ($days->isEmpty()) {
            return 0;
        }

        $cursor = Carbon::now()->startOfDay();
        $first = (string) $days->first();

        if ($first === $cursor->copy()->subDay()->toDateString()) {
            $cursor->subDay();
        } elseif ($first !== $cursor->toDateString()) {
            return 0;
        }

        $streak = 0;

        foreach ($days as $day) {
            if ((string) $day !== $cursor->toDateString()) {
                break;
            }

            $streak++;
            $cursor->subDay();
        }

        return $streak;
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
}
