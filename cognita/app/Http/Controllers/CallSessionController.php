<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\RealtimeProvider;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\BoardSessions;
use App\Services\CallSeats;
use App\Services\DrawPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
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
        private readonly BoardSessions $sessions,
        private readonly AttendanceTracker $attendance,
        private readonly RealtimeProvider $realtime,
        private readonly CallSeats $seats,
        private readonly DrawPermissions $draw,
    ) {}

    /**
     * Announce a session for the class.
     *
     * Only the instructor can do this. Once announced, students may enter the
     * room and wait for it to open; a student can never announce or start one.
     */
    public function schedule(Request $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('schedule', [CallSession::class, $classroom]);

        /** @var array{title?: string|null, description?: string|null, starts_at: string, ends_at?: string|null, document_ids?: list<int>} $data */
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'lesson_id' => ['nullable', 'integer', Rule::exists('lessons', 'id')],
            'document_ids' => ['sometimes', 'array'],
            'document_ids.*' => ['integer', Rule::exists('class_documents', 'id')->where('classroom_id', $classroom->getKey())],
        ]);

        $startsAt = Carbon::parse($data['starts_at']);
        $endsAt = isset($data['ends_at']) && $data['ends_at'] !== null
            ? Carbon::parse($data['ends_at'])
            : null;

        $session = $this->sessions->schedule(
            $classroom,
            $user,
            $data['title'] ?? null,
            $startsAt,
            $endsAt,
            $data['description'] ?? null,
            isset($data['lesson_id']) ? (int) $data['lesson_id'] : null,
        );

        if (array_key_exists('document_ids', $data)) {
            $session->materials()->sync($data['document_ids']);
        }

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'data' => $this->payload($session),
            ]);
        }

        return back()->with('success', 'Session scheduled. Students can wait in the room from '.$startsAt->format('D j M, H:i').'.');
    }

    /**
     * Start the announced session now.
     *
     * Everyone waiting for it sees the room open and joins it.
     */
    public function start(Request $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('start', [CallSession::class, $classroom]);

        $session = $this->sessions->start($classroom, $user);

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'data' => [
                    ...$this->payload($session),
                    'live' => true,
                ],
            ]);
        }

        return back()->with('success', 'Session started. The room is open.');
    }

    /** Join the room, or keep it warm. Called on connect and on a timer. */
    public function touch(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('joinCall', $classroom);

        $role = (int) $classroom->instructor_id === (int) $user->getKey() ? 'host' : 'participant';

        $session = $role === 'host'
            ? $this->sessions->open($classroom, $user)
            : $this->sessions->touch($this->sessions->live($classroom));

        if ($session !== null) {
            $this->seats->claim($classroom, $user, $request->session()->getId());
        }

        $attendance = $session !== null && $role === 'participant'
            ? $this->attendance->payload($this->attendance->attach($classroom, $user, $session))
            : null;

        $current = $session ?? $this->sessions->nextScheduled($classroom);

        return response()->json([
            'data' => [
                'session' => $session?->token,
                'live' => $session !== null,
                'state' => $this->sessions->stateGiven($classroom, $session, $session === null ? $current : null),
                'starts_at' => $current?->starts_at?->toIso8601String(),
                'title' => $current?->title,
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

        $this->authorize('joinCall', $classroom);
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
     * After this, the session is behind the students and cannot be rejoined.
     */
    public function end(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('end', [CallSession::class, $classroom]);

        $this->sessions->endAll($classroom);
        $this->attendance->closeOpenForClassroom($classroom);
        $this->seats->clearClassroom($classroom);
        $this->draw->clear((int) $classroom->getKey());

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

        $this->authorize('restart', [CallSession::class, $classroom]);

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

    /** @return array{id: int, title: string|null, description: string|null, lesson_id: int|null, state: string, starts_at: string|null, ends_at: string|null, materials: list<array{id: int, name: string, pages: int, size: int, url: string}>} */
    private function payload(CallSession $session): array
    {
        return [
            'id' => (int) $session->getKey(),
            'title' => $session->title,
            'description' => $session->description,
            'lesson_id' => $session->lesson_id === null ? null : (int) $session->lesson_id,
            'state' => $session->state(),
            'starts_at' => $session->starts_at?->toIso8601String(),
            'ends_at' => $session->ends_at?->toIso8601String(),
            'materials' => $session->materials->map->materialReference()->values()->all(),
        ];
    }
}
