<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Automatic call attendance, tied to the instructor's class session.
 *
 * One instructor session holds one attendance row per student. Leaving closes
 * the row; rejoining the same session reopens it and keeps adding time. The row
 * is finally closed when the instructor deliberately ends the class.
 */
class AttendanceTracker
{
    /**
     * How long a record still counts as "in the call" after its last heartbeat.
     *
     * The browser pings once a minute, so three quiet minutes is a tab that has
     * gone away — long enough to survive a slow request or a closing laptop,
     * short enough that a dashboard never calls an empty room full.
     */
    public const PRESENT_WINDOW_SECONDS = 180;

    /**
     * Create or resume this student's row for one instructor session.
     *
     * A rejoin keeps the original first-join time and accumulated seconds; the
     * gap while they were away is not counted.
     */
    public function start(Classroom $classroom, User $student, CallSession $session): AttendanceRecord
    {
        $now = now();

        $record = AttendanceRecord::query()
            ->where('call_session_id', $session->getKey())
            ->where('user_id', $student->getKey())
            ->first();

        if ($record !== null) {
            if ($record->left_at === null) {
                $this->accumulate($record, $now);
            }

            $record->forceFill([
                'left_at' => null,
                'last_seen_at' => $now,
            ])->save();

            return $record;
        }

        return AttendanceRecord::query()->create([
            'classroom_id' => $classroom->getKey(),
            'call_session_id' => $session->getKey(),
            'user_id' => $student->getKey(),
            'attended_on' => $now->toDateString(),
            'joined_at' => $now,
            'last_seen_at' => $now,
            'present_seconds' => 0,
        ]);
    }

    /**
     * Attach a student to a session without changing their timer.
     *
     * The room heartbeat calls this every few seconds. It is what gives a
     * student who was already waiting in the call a row when the instructor
     * opens the class, and it stays harmless when the row already exists.
     */
    public function attach(Classroom $classroom, User $student, CallSession $session): AttendanceRecord
    {
        $now = now();

        return AttendanceRecord::query()->firstOrCreate(
            [
                'call_session_id' => $session->getKey(),
                'user_id' => $student->getKey(),
            ],
            [
                'classroom_id' => $classroom->getKey(),
                'attended_on' => $now->toDateString(),
                'joined_at' => $now,
                'last_seen_at' => $now,
                'present_seconds' => 0,
            ],
        );
    }

    public function ping(AttendanceRecord $record): AttendanceRecord
    {
        if ($record->callSession?->ended_at !== null) {
            return $record;
        }

        $now = now();

        if ($record->left_at === null) {
            $this->accumulate($record, $now);
        }

        // A ping from another tab reopens a row that a closing tab had marked
        // as left; the gap itself is not counted.
        $record->forceFill([
            'last_seen_at' => $now,
            'left_at' => null,
        ])->save();

        return $record;
    }

    public function leave(AttendanceRecord $record): void
    {
        if ($record->left_at !== null) {
            return;
        }

        $now = now();

        $this->accumulate($record, $now);

        $record->forceFill([
            'last_seen_at' => $now,
            'left_at' => $now,
        ])->save();
    }

    /**
     * Close every open row when the instructor ends the class.
     */
    public function closeOpenForClassroom(Classroom $classroom): void
    {
        AttendanceRecord::query()
            ->where('classroom_id', $classroom->getKey())
            ->whereNull('left_at')
            ->get()
            ->each(fn (AttendanceRecord $record) => $this->leave($record));
    }

    /** @return array{id: int, ping_url: string, leave_url: string} */
    public function payload(AttendanceRecord $record): array
    {
        return [
            'id' => (int) $record->getKey(),
            'ping_url' => route('call.attendance.ping', [
                'classroom' => $record->classroom_id,
                'attendance' => $record->getKey(),
            ], absolute: false),
            'leave_url' => route('call.attendance.leave', [
                'classroom' => $record->classroom_id,
                'attendance' => $record->getKey(),
            ], absolute: false),
        ];
    }

    /**
     * How many students are in a call right now, per class.
     *
     * "Right now" is a heartbeat question rather than a session question: a
     * record is in the call while it is open and was touched inside
     * {@see self::PRESENT_WINDOW_SECONDS}. One student may hold several rows for
     * a day, so the count is of people, not of rows.
     *
     * @param  iterable<int>  $classroomIds
     * @return array<int, int> classroom id => students in the call
     */
    public function presentNowByClassroom(iterable $classroomIds): array
    {
        $ids = collect($classroomIds)->map(static fn ($id): int => (int) $id)->all();

        if ($ids === []) {
            return [];
        }

        return AttendanceRecord::query()
            ->whereIn('classroom_id', $ids)
            ->whereNull('left_at')
            ->where('last_seen_at', '>=', now()->subSeconds(self::PRESENT_WINDOW_SECONDS))
            ->groupBy('classroom_id')
            ->selectRaw('classroom_id, count(distinct user_id) as present')
            ->toBase()
            ->get()
            ->mapWithKeys(static fn (object $row): array => [(int) $row->classroom_id => (int) $row->present])
            ->all();
    }

    /**
     * @return array{
     *     classroom: string,
     *     date: string,
     *     date_label: string,
     *     present: int,
     *     absent: int,
     *     rows: list<array{
     *         id: int,
     *         name: string,
     *         email: string,
     *         status: string,
     *         first_joined: string,
     *         last_seen: string,
     *         sessions: int,
     *         duration_seconds: int,
     *         duration: string
     *     }>
     * }
     */
    public function report(Classroom $classroom, string $date): array
    {
        $students = $classroom->students()
            ->orderBy('users.name')
            ->get(['users.id', 'users.name', 'users.email']);

        $records = AttendanceRecord::query()
            ->where('classroom_id', $classroom->getKey())
            ->whereDate('attended_on', $date)
            ->get()
            ->groupBy('user_id');

        $rows = $students->map(function (User $student) use ($records): array {
            /** @var Collection<int, AttendanceRecord> $sessions */
            $sessions = $records->get($student->getKey(), collect());
            $first = $sessions->sortBy('joined_at')->first();
            $last = $sessions->sortByDesc('last_seen_at')->first();
            $seconds = (int) $sessions->sum(fn (AttendanceRecord $record): int => $record->seconds());

            return [
                'id' => (int) $student->getKey(),
                'name' => (string) $student->name,
                'email' => (string) $student->email,
                'status' => $sessions->isNotEmpty() ? 'Present' : 'Absent',
                'first_joined' => $first?->joined_at->format('H:i') ?? '—',
                'last_seen' => $last?->last_seen_at->format('H:i') ?? '—',
                'sessions' => $sessions->count(),
                'duration_seconds' => $seconds,
                'duration' => $this->duration($seconds),
            ];
        })->values()->all();

        $present = count(array_filter($rows, static fn (array $row): bool => $row['status'] === 'Present'));

        return [
            'classroom' => (string) $classroom->name,
            'date' => $date,
            'date_label' => Carbon::createFromFormat('Y-m-d', $date)->format('D, j M Y'),
            'present' => $present,
            'absent' => count($rows) - $present,
            'rows' => $rows,
        ];
    }

    public function date(?string $value): string
    {
        if (
            is_string($value)
            && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $matches) === 1
            && checkdate((int) $matches[2], (int) $matches[3], (int) $matches[1])
        ) {
            return $value;
        }

        return now()->toDateString();
    }

    /**
     * Add the time since the last known activity to the finished total.
     *
     * Capped at the presence window: a laptop that vanished for an hour should
     * not come back with an hour of attendance.
     */
    private function accumulate(AttendanceRecord $record, Carbon $now): void
    {
        if ($record->last_seen_at === null) {
            return;
        }

        $elapsed = max(0, $now->getTimestamp() - $record->last_seen_at->getTimestamp());
        $elapsed = min($elapsed, self::PRESENT_WINDOW_SECONDS);

        $record->forceFill([
            'present_seconds' => (int) $record->present_seconds + $elapsed,
        ]);
    }

    private function duration(int $seconds): string
    {
        if ($seconds < 60) {
            return $seconds.'s';
        }

        $minutes = intdiv($seconds, 60);
        $remaining = $seconds % 60;

        return $remaining === 0 ? $minutes.'m' : $minutes.'m '.$remaining.'s';
    }
}
