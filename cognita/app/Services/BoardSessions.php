<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\LiveSessionStatus;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The lifetime of one class session and the board inside it.
 *
 * Everything here answers a single question — "which room, if any, is this class
 * in right now?" — so the controllers never have to. The rules the UI depends on:
 *
 *   - only the instructor opens a room, and only a session they scheduled or
 *     started themselves can be live,
 *   - a student who arrives before the instructor waits in the waiting room of
 *     the announced session; they never open one themselves,
 *   - a session that has ended, or whose window closed without it opening, is
 *     behind the student and cannot be rejoined,
 *   - losing the host's network, leaving the page or reconnecting never closes
 *     a live session,
 *   - rotating the board starts a clean canvas inside the same class session.
 *
 * The session row is also what attendance uses to keep one row per student for
 * the whole lesson. No ink passes through here: the token every browser compares
 * is what tells them all to blank the board at the same moment.
 */
class BoardSessions
{
    public function __construct(private readonly DrawPermissions $permissions) {}

    /** The room the class is in, or null when the instructor has not opened one. */
    public function live(Classroom $classroom): ?CallSession
    {
        return $classroom->callSessions()
            ->where('status', LiveSessionStatus::Live)
            ->whereNull('ended_at')
            ->latest('id')
            ->first();
    }

    /**
     * Which of these classes are in a live room right now, in one query.
     *
     * The dashboard asks this question about every class it lists, so it must
     * not become one query per card. The rule is exactly the one {@see self::live()}
     * applies, only asked in the plural.
     *
     * @param  iterable<int>  $classroomIds
     * @return list<int> ids of the classes with an open room
     */
    public function liveAmong(iterable $classroomIds): array
    {
        $ids = collect($classroomIds)->map(static fn ($id): int => (int) $id)->all();

        if ($ids === []) {
            return [];
        }

        return CallSession::query()
            ->whereIn('classroom_id', $ids)
            ->where('status', LiveSessionStatus::Live)
            ->whereNull('ended_at')
            ->distinct()
            ->pluck('classroom_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();
    }

    /**
     * The next session the instructor announced, whether or not it is due yet.
     *
     * A student entering this session waits in the waiting room until the
     * instructor starts it.
     */
    public function nextScheduled(Classroom $classroom): ?CallSession
    {
        return $classroom->callSessions()
            ->with('materials')
            ->where('status', LiveSessionStatus::Scheduled)
            ->where(static function ($query): void {
                $query->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->orderBy('starts_at')
            ->orderBy('id')
            ->first();
    }

    /**
     * The next announced session for each of these classes, in one query.
     *
     * The dashboards ask this about every class they list, so it must not
     * become one query per card. The rule is exactly the one
     * {@see self::nextScheduled()} applies, only asked in the plural.
     *
     * @param  iterable<int>  $classroomIds
     * @return Collection<int, CallSession> keyed by classroom id
     */
    public function nextScheduledAmong(iterable $classroomIds): Collection
    {
        $ids = collect($classroomIds)->map(static fn ($id): int => (int) $id)->all();

        if ($ids === []) {
            return collect();
        }

        return CallSession::query()
            ->with('materials')
            ->whereIn('classroom_id', $ids)
            ->where('status', LiveSessionStatus::Scheduled)
            ->where(static function ($query): void {
                $query->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get()
            ->unique('classroom_id')
            ->keyBy('classroom_id');
    }

    /**
     * Whether a session was announced, its window closed and it never opened.
     *
     * A missed session is behind the students just like a finished one.
     */
    public function hasMissed(Classroom $classroom): bool
    {
        return $classroom->callSessions()
            ->where('status', LiveSessionStatus::Scheduled)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<', now())
            ->exists();
    }

    /** The most recent session that is over, if the class has had one. */
    public function lastEnded(Classroom $classroom): ?CallSession
    {
        return $classroom->callSessions()
            ->where('status', LiveSessionStatus::Completed)
            ->latest('id')
            ->first();
    }

    /**
     * What a student meets when they open the room of this class.
     *
     *   live     the instructor has the room open,
     *   waiting  a session was announced and has not started yet,
     *   passed   the session is over and cannot be rejoined,
     *   none     the instructor has not announced anything.
     */
    public function stateFor(Classroom $classroom): string
    {
        $live = $this->live($classroom);

        if ($live !== null) {
            return 'live';
        }

        return $this->stateGiven($classroom, null, $this->nextScheduled($classroom));
    }

    /**
     * The same state, once the caller has already resolved the rooms.
     *
     * The call heartbeat asks this every few seconds; re-asking the database
     * the questions it has just answered would add four queries to every beat.
     */
    public function stateGiven(Classroom $classroom, ?CallSession $live, ?CallSession $scheduled): string
    {
        if ($live !== null) {
            return 'live';
        }

        if ($scheduled !== null) {
            return 'waiting';
        }

        if ($this->lastEnded($classroom) !== null || $this->hasMissed($classroom)) {
            return 'passed';
        }

        return 'none';
    }

    /**
     * Announce a session: a title, a start time and the window it runs for.
     *
     * Only the instructor can do this. Students may only enter sessions that
     * exist, which is why the room the student sees is always one of these.
     */
    public function schedule(
        Classroom $classroom,
        User $host,
        ?string $title,
        Carbon $startsAt,
        ?Carbon $endsAt = null,
        ?string $description = null,
        ?int $lessonId = null,
    ): CallSession {
        return $classroom->callSessions()->create([
            'course_id' => $classroom->course_id,
            'lesson_id' => $lessonId,
            'title' => $title === null || trim($title) === '' ? null : trim($title),
            'description' => $description === null || trim($description) === '' ? null : trim($description),
            'starts_at' => $startsAt,
            'ends_at' => $endsAt ?? $startsAt->copy()->addHour(),
            'status' => LiveSessionStatus::Scheduled,
            'token' => Str::random(20),
            'opened_by' => $host->getKey(),
            'last_seen_at' => $startsAt,
        ]);
    }

    /**
     * Join the live room, or open a fresh one. Only a host calls this: a student
     * who arrives first waits for the room the instructor opens.
     */
    public function open(Classroom $classroom, ?User $host = null): CallSession
    {
        // Serialise "is there a live room yet?" across concurrent join clicks so
        // two requests can never each create their own live session.
        return DB::transaction(fn (): CallSession => $this->openUnlocked($classroom, $host));
    }

    private function openUnlocked(Classroom $classroom, ?User $host): CallSession
    {
        $this->lock($classroom);

        $session = $this->live($classroom);

        if ($session !== null) {
            return $this->touch($session) ?? $session;
        }

        // An announced session that is already due becomes the live room, so
        // the instructor can simply walk in when the lesson starts.
        $due = $this->nextScheduled($classroom);

        if ($due !== null && $due->starts_at !== null && $due->starts_at->isPast() && ! $due->hasPassed()) {
            return $this->startUnlocked($classroom, $host, $due);
        }

        return $classroom->callSessions()->create([
            'course_id' => $classroom->course_id,
            'status' => LiveSessionStatus::Live,
            'starts_at' => now(),
            'token' => Str::random(20),
            'opened_by' => $host?->getKey(),
            'last_seen_at' => now(),
        ]);
    }

    /**
     * Start an announced session now, even a little early or a little late.
     *
     * This is the instructor's "begin the lesson" action. Everyone waiting for
     * that session sees the room open and joins it.
     */
    public function start(Classroom $classroom, ?User $host = null, ?CallSession $session = null): CallSession
    {
        return DB::transaction(fn (): CallSession => $this->startUnlocked($classroom, $host, $session));
    }

    private function startUnlocked(Classroom $classroom, ?User $host, ?CallSession $session): CallSession
    {
        $this->lock($classroom);

        $live = $this->live($classroom);

        if ($live !== null) {
            return $this->touch($live) ?? $live;
        }

        $session ??= $this->nextScheduled($classroom);

        if ($session === null) {
            return $this->openUnlocked($classroom, $host);
        }

        $session->forceFill([
            'status' => LiveSessionStatus::Live,
            'opened_by' => $host?->getKey() ?? $session->opened_by,
            'last_seen_at' => now(),
            'ended_at' => null,
        ])->save();

        return $session;
    }

    /** Take the classroom row lock that makes room opening atomic. */
    private function lock(Classroom $classroom): void
    {
        Classroom::query()->whereKey($classroom->getKey())->lockForUpdate()->first();
    }

    /** Mark activity without deciding whether the session should still exist. */
    public function touch(?CallSession $session): ?CallSession
    {
        if ($session === null || ! $session->isLive()) {
            return null;
        }

        $session->forceFill(['last_seen_at' => now()])->save();

        return $session;
    }

    /** End a room. Only an explicit instructor "End class" reaches this. */
    public function end(?CallSession $session): void
    {
        if ($session === null || ! $session->isLive()) {
            return;
        }

        $session->forceFill([
            'status' => LiveSessionStatus::Completed,
            'ended_at' => now(),
        ])->save();

        // The pen goes back to the instructor with the room: the next class
        // starts without anyone holding it.
        $this->permissions->clear((int) $session->classroom_id);
    }

    /** End every open room of a class. */
    public function endAll(Classroom $classroom): void
    {
        $classroom->callSessions()
            ->where('status', LiveSessionStatus::Live)
            ->whereNull('ended_at')
            ->get()
            ->each(fn (CallSession $session) => $this->end($session));
    }

    /**
     * Rotate the board into a new room inside the same class session.
     *
     * The instructor's "fresh page for the next exercise" move keeps attendance
     * and the class session intact. The new token is what makes every browser
     * clear its ink; the surface and the PDF on the board are kept.
     */
    public function restart(Classroom $classroom, ?User $host = null): CallSession
    {
        $session = $this->live($classroom);

        if ($session === null) {
            return $this->open($classroom, $host);
        }

        $session->forceFill([
            'token' => Str::random(20),
            'last_seen_at' => now(),
        ])->save();

        return $session;
    }

    /**
     * The sessions of a class, newest first, for the instructor and for the
     * student who is waiting for one.
     *
     * @return Collection<int, CallSession>
     */
    public function history(Classroom $classroom, int $limit = 12)
    {
        return $classroom->callSessions()
            ->with('materials')
            ->orderByDesc('starts_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }
}
