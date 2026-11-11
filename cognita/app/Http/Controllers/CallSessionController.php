<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\RealtimeProvider;
use App\Models\Classroom;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\BoardSessions;
use App\Services\CallSeats;
use App\Services\ClassroomAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * The class session's lifetime, driven by the browser.
 *
 * The instructor opens it on join; students only attach to the open session.
 * The call page touches the session while it stays open, which keeps the board
 * alive and gives a waiting student their attendance row once the instructor
 * arrives. A network drop, a closed tab or a rejoin leaves the session alone:
 * only the explicit End class action closes it.
 */
class CallSessionController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly BoardSessions $sessions,
        private readonly AttendanceTracker $attendance,
        private readonly RealtimeProvider $realtime,
        private readonly CallSeats $seats,
    ) {}

    /** Join the room, or keep it warm. Called on connect and on a timer. */
    public function touch(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        ['role' => $role] = $this->access->assertCanJoinCall($user, $classroom);

        $session = $role === ClassroomAccess::ROLE_HOST
            ? $this->sessions->open($classroom, $user)
            : $this->sessions->touch($this->sessions->live($classroom));

        if ($session !== null) {
            $this->seats->claim($classroom, $user, $request->session()->getId());
        }

        $attendance = $session !== null && $role === ClassroomAccess::ROLE_PARTICIPANT
            ? $this->attendance->payload($this->attendance->attach($classroom, $user, $session))
            : null;

        return response()->json([
            'data' => [
                'session' => $session?->token,
                'live' => $session !== null,
                'board' => $session === null ? null : $classroom->boardOrCreate()->state($session),
                'attendance' => $attendance,
            ],
        ]);
    }

    /**
     * Leave the call page.
     *
     * A student leaving stops their heartbeats; an instructor leaving stops
     * theirs. Neither ends the class session, so both can come back to the same
     * lesson after a network problem. Only {@see self::end} does that.
     */
    public function leave(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->access->assertCanJoinCall($user, $classroom);
        $this->seats->release($classroom, $user, $request->session()->getId());

        return response()->json([
            'data' => [
                'live' => $this->sessions->live($classroom) !== null,
            ],
        ]);
    }

    /**
     * The instructor's deliberate end of the lesson.
     *
     * This is the only path that closes the class session. It also closes every
     * open attendance row and asks the call server to disconnect everybody.
     */
    public function end(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->access->assertHost($user, $classroom, 'Only the class instructor can end the class session.');

        $this->sessions->endAll($classroom);
        $this->attendance->closeOpenForClassroom($classroom);
        $this->seats->clearClassroom($classroom);

        if ($this->realtime->configured()) {
            try {
                $this->realtime->endRoom($classroom, $request);
            } catch (Throwable $error) {
                // The session and attendance are already closed. Failing to
                // reach the SFU must not resurrect either of them.
                report($error);
            }
        }

        return response()->json([
            'data' => [
                'live' => false,
                'ended_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Clear the board into a new room without dropping anyone from the call or
     * ending the class session: the host's "fresh page" control.
     */
    public function restart(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->access->assertHost($user, $classroom, 'Only the class instructor can start a new room.');

        $session = $this->sessions->restart($classroom, $user);

        return response()->json([
            'data' => [
                'session' => $session->token,
                'live' => true,
                'board' => $classroom->boardOrCreate()->state($session),
                'attendance' => null,
            ],
        ]);
    }
}
