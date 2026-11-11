<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * The lifetime of one class session and the board inside it.
 *
 * Everything here answers a single question — "which room, if any, is this class
 * in right now?" — so the controllers never have to. The rules the UI depends on:
 *
 *   - a session is opened by the host and stays live until the host ends it,
 *   - losing the host's network, leaving the page or reconnecting never closes it,
 *   - a student who arrives first waits for the instructor to open one,
 *   - rotating the board starts a clean canvas inside the same class session.
 *
 * The session row is also what attendance uses to keep one row per student for
 * the whole lesson. No ink passes through here: the token every browser compares
 * is what tells them all to blank the board at the same moment.
 */
class BoardSessions
{
    /** The room the class is in, or null when the instructor has not opened one. */
    public function live(Classroom $classroom): ?CallSession
    {
        return $classroom->callSessions()
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
            ->whereNull('ended_at')
            ->distinct()
            ->pluck('classroom_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();
    }

    /**
     * Join the live room, or open a fresh one. Only a host calls this: a student
     * who arrives first waits for the room the instructor opens.
     */
    public function open(Classroom $classroom, ?User $host = null): CallSession
    {
        $session = $this->live($classroom);

        if ($session !== null) {
            return $this->touch($session) ?? $session;
        }

        return $classroom->callSessions()->create([
            'token' => Str::random(20),
            'opened_by' => $host?->getKey(),
            'last_seen_at' => now(),
        ]);
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

        $session->forceFill(['ended_at' => now()])->save();
    }

    /** End every open room of a class. */
    public function endAll(Classroom $classroom): void
    {
        $classroom->callSessions()
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
}
