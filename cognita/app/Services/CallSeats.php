<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CallSeat;
use App\Models\Classroom;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * One account, one live seat per class.
 *
 * A second browser or device using the same account is refused while the seat
 * is fresh. The seat is refreshed by the call heartbeat and released on leave,
 * so a crashed browser only blocks the account for a short grace period.
 */
class CallSeats
{
    /** The default grace period when a browser disappears without leaving. */
    public const STALE_SECONDS = 45;

    public function claim(Classroom $classroom, User $user, string $sessionId): CallSeat
    {
        return DB::transaction(function () use ($classroom, $user, $sessionId): CallSeat {
            $now = now();
            $seat = CallSeat::query()
                ->where('classroom_id', $classroom->getKey())
                ->where('user_id', $user->getKey())
                ->lockForUpdate()
                ->first();

            if ($seat === null) {
                return CallSeat::query()->create([
                    'classroom_id' => $classroom->getKey(),
                    'user_id' => $user->getKey(),
                    'session_id' => $sessionId,
                    'last_seen_at' => $now,
                ]);
            }

            $staleSeconds = max(15, (int) config('calls.stale_seat_seconds', self::STALE_SECONDS));

            if (hash_equals($seat->session_id, $sessionId)
                || $seat->last_seen_at->lt($now->copy()->subSeconds($staleSeconds))
                || ! (bool) config('calls.enforce_seats', true)) {
                $seat->forceFill([
                    'session_id' => $sessionId,
                    'last_seen_at' => $now,
                ])->save();

                return $seat;
            }

            abort(409, 'This account is already in this call in another browser or on another device. Leave that call first, or wait a minute if it was closed unexpectedly.');
        });
    }

    public function release(Classroom $classroom, User $user, string $sessionId): void
    {
        CallSeat::query()
            ->where('classroom_id', $classroom->getKey())
            ->where('user_id', $user->getKey())
            ->where('session_id', $sessionId)
            ->delete();
    }

    public function clearClassroom(Classroom $classroom): void
    {
        CallSeat::query()->where('classroom_id', $classroom->getKey())->delete();
    }
}
