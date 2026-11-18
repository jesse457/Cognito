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
use App\Services\CoursePayments;
use App\Services\DrawPermissions;
use App\Services\LiveKitProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The live group call for a class.
 *
 * The page is rendered for the class instructor and for students who joined
 * with the class key. The token endpoint mints a short-lived, voice-scoped grant
 * for the same caller; the page requests it after the Join button is pressed so
 * the microphone prompt stays tied to a user gesture.
 *
 * Nothing here knows which realtime product serves the call: the provider is
 * resolved from config/services.php and the page is handed its driver name, so
 * the browser can pick the adapter that matches.
 */
class LiveCallController extends Controller
{
    public function __construct(
        private readonly BoardSessions $sessions,
        private readonly RealtimeProvider $realtime,
        private readonly AttendanceTracker $attendance,
        private readonly CallSeats $seats,
        private readonly DrawPermissions $draw,
        private readonly CoursePayments $payments,
    ) {}

    public function show(Request $request, Classroom $classroom): Response
    {
        /** @var User $user */
        $user = $request->user();

        /*
        | The page itself is open to the class (and its instructor) even when a
        | paid course is still unpaid: that is where the student sees the price
        | and tells the instructor they have paid. The room and its token stay
        | behind the joinCall policy, so the paywall and the room share one rule.
        */
        $this->authorize('viewCall', $classroom);

        $role = $this->role($user, $classroom);

        $payment = $this->payments->stateFor(
            $classroom,
            $role === 'participant' ? $user : null,
        );
        $payment['can_access'] = $role === 'host' || $payment['can_access'];

        $board = $classroom->boardOrCreate();
        $session = $this->sessions->live($classroom);
        $state = $board->state($session);
        $canManageBoard = $role === 'host';
        $viewerCanDraw = in_array((int) $user->getKey(), $state['allowedDrawerIds'], true);

        /*
        | The state of the session this student is looking at:
        |   live     the instructor has the room open,
        |   waiting  a session was announced and has not started yet,
        |   passed   the session is over and cannot be rejoined,
        |   none     the instructor has not announced anything.
        */
        $announced = $session ?? $this->sessions->nextScheduled($classroom);
        $sessionState = $this->sessions->stateGiven(
            $classroom,
            $session,
            $session === null ? $announced : null,
        );

        return Inertia::render('LiveCall/Room', [
            'classroom' => [
                'id' => (int) $classroom->getKey(),
                'name' => $classroom->name,
                'join_code' => $classroom->join_code,
                'course' => $classroom->course?->title,
                'instructor' => $classroom->instructor?->name,
            ],
            'role' => $role,
            'session' => [
                'state' => $sessionState,
                'id' => $announced === null ? null : (int) $announced->getKey(),
                'title' => $announced?->title,
                'description' => $announced?->description,
                'starts_at' => $announced?->starts_at?->toIso8601String(),
                'ends_at' => $announced?->ends_at?->toIso8601String(),
                'host' => $classroom->instructor?->name,
            ],
            'payment' => $payment,
            'viewerId' => (int) $user->getKey(),
            'viewerName' => (string) $user->name,
            'students' => $this->students($classroom),
            'board' => $state,
            'canEditBoard' => $canManageBoard || $viewerCanDraw,
            'canManageBoard' => $canManageBoard,
            'room' => $this->realtime->room($classroom),
            'realtime' => [
                'driver' => $this->realtime->driver(),
                'configured' => $this->realtime->configured(),
                'signalUrl' => $this->realtime->signalUrl($request),
                'secureUrl' => $this->realtime->secureUrl($request),
                'tokenUrl' => route('call.token', ['classroom' => $classroom->getKey()]),
                'doctorUrl' => route('call.doctor', ['classroom' => $classroom->getKey()]),
                'touchUrl' => route('call.session.touch', ['classroom' => $classroom->getKey()]),
                'leaveUrl' => route('call.session.leave', ['classroom' => $classroom->getKey()]),
                'restartUrl' => route('call.session.restart', ['classroom' => $classroom->getKey()]),
                'endUrl' => route('call.session.end', ['classroom' => $classroom->getKey()]),
            ],
            // The host can pull the register in a spare tab without leaving the call.
            'attendanceUrl' => $canManageBoard
                ? route('instructor.classes.attendance', ['classroom' => $classroom->getKey()])
                : null,
            'boardUrl' => route('board.update', ['classroom' => $classroom->getKey()]),
            'boardPdfUrl' => route('board.document.store', ['classroom' => $classroom->getKey()]),
            'backUrl' => $this->backUrl($role, $classroom),
        ]);
    }

    public function token(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('joinCall', $classroom);

        $role = $this->role($user, $classroom);

        /*
        | A student may only be handed a voice token for a session that is
        | actually open. A session that was announced but has not started is
        | waited for, and one that has passed cannot be rejoined.
        */
        if ($role === 'participant') {
            $state = $this->sessions->stateFor($classroom);

            if ($state !== 'live') {
                abort(403, match ($state) {
                    'waiting' => 'The session has not started yet. Wait for the instructor to open the room.',
                    'passed' => 'This session has ended. It cannot be rejoined.',
                    default => 'The instructor has not announced a session yet.',
                });
            }
        }

        $session = $request->string('session')->toString();
        $session = preg_match(LiveKitProvider::SESSION_PATTERN, $session) === 1 ? $session : null;

        $grant = $this->realtime->grant($user, $classroom, $role, $session, $request);

        $this->seats->claim($classroom, $user, $request->session()->getId());

        // Joining opens the room for a host, and joins the open one for a
        // student: either way the joiner is handed the ink that is on the board
        // at that moment.
        $room = $role === 'host'
            ? $this->sessions->open($classroom, $user)
            : $this->sessions->touch($this->sessions->live($classroom));

        return response()->json([
            'data' => [
                ...$grant,
                'session' => $room?->token,
                'board' => $classroom->boardOrCreate()->state($room),
                'attendance' => $role === 'participant' && $room !== null
                    ? $this->startAttendance($classroom, $user, $room)
                    : null,
            ],
        ]);
    }

    /**
     * Plain-language health report for the caller's own address: the browser
     * shows it when a join fails, so the reason is never just "Reconnecting".
     */
    public function doctor(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('joinCall', $classroom);

        return response()->json([
            'data' => $this->realtime->diagnose(
                $request,
                route('call.show', ['classroom' => $classroom->getKey()], false),
            ),
        ]);
    }

    private function role(User $user, Classroom $classroom): string
    {
        return (int) $classroom->instructor_id === (int) $user->getKey() ? 'host' : 'participant';
    }

    /** @return list<array{id: int, name: string, can_draw: bool}> */
    private function students(Classroom $classroom): array
    {
        $permissions = $this->draw->allowed((int) $classroom->getKey());

        return $classroom->students()
            ->orderBy('users.name')
            ->get(['users.id', 'users.name'])
            ->map(static fn (User $student): array => [
                'id' => (int) $student->getKey(),
                'name' => (string) $student->name,
                'can_draw' => in_array((int) $student->getKey(), $permissions, true),
            ])
            ->values()
            ->all();
    }

    /** @return array{id: int, ping_url: string, leave_url: string} */
    private function startAttendance(Classroom $classroom, User $user, CallSession $session): array
    {
        return $this->attendance->payload($this->attendance->start($classroom, $user, $session));
    }

    private function backUrl(string $role, Classroom $classroom): string
    {
        if ($role === 'host') {
            return route('instructor.classes.show', ['classroom' => $classroom->getKey()]);
        }

        return route('student.home');
    }
}
