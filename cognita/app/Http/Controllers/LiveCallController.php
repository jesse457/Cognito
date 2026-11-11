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
use App\Services\ClassroomAccess;
use App\Services\LiveKit;
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
 * resolved from config/realtime.php and the page is handed its driver name, so
 * the browser can pick the adapter that matches.
 */
class LiveCallController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly BoardSessions $sessions,
        private readonly RealtimeProvider $realtime,
        private readonly AttendanceTracker $attendance,
        private readonly CallSeats $seats,
    ) {}

    public function show(Request $request, Classroom $classroom): Response
    {
        /** @var User $user */
        $user = $request->user();

        ['role' => $role] = $this->access->assertCanJoinCall($user, $classroom);

        $board = $classroom->boardOrCreate();
        $session = $this->sessions->live($classroom);
        $state = $board->state($session);
        $canManageBoard = $role === ClassroomAccess::ROLE_HOST;
        $viewerCanDraw = in_array((int) $user->getKey(), $state['allowedDrawerIds'], true);

        return Inertia::render('LiveCall/Room', [
            'classroom' => [
                'id' => (int) $classroom->getKey(),
                'name' => $classroom->name,
                'join_code' => $classroom->join_code,
                'course' => $classroom->course?->title,
                'instructor' => $classroom->instructor?->name,
            ],
            'role' => $role,
            'viewerId' => (int) $user->getKey(),
            'viewerName' => (string) $user->name,
            'students' => $this->students($classroom),
            'board' => $state,
            'canEditBoard' => $canManageBoard || ($board->students_can_annotate && $viewerCanDraw),
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

        ['role' => $role] = $this->access->assertCanJoinCall($user, $classroom);

        $session = $request->string('session')->toString();
        $session = preg_match(LiveKit::SESSION_PATTERN, $session) === 1 ? $session : null;

        $grant = $this->realtime->grant($user, $classroom, $role, $session, $request);

        $this->seats->claim($classroom, $user, $request->session()->getId());

        // Joining opens the room for a host, and joins the open one for a
        // student: either way the joiner is handed the ink that is on the board
        // at that moment.
        $room = $role === ClassroomAccess::ROLE_HOST
            ? $this->sessions->open($classroom, $user)
            : $this->sessions->touch($this->sessions->live($classroom));

        return response()->json([
            'data' => [
                ...$grant,
                'session' => $room?->token,
                'board' => $classroom->boardOrCreate()->state($room),
                'attendance' => $role === ClassroomAccess::ROLE_PARTICIPANT && $room !== null
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

        $this->access->assertCanJoinCall($user, $classroom);

        return response()->json([
            'data' => $this->realtime->diagnose(
                $request,
                route('call.show', ['classroom' => $classroom->getKey()], false),
            ),
        ]);
    }

    /** @return list<array{id: int, name: string, can_draw: bool}> */
    private function students(Classroom $classroom): array
    {
        return $classroom->students()
            ->orderBy('users.name')
            ->get(['users.id', 'users.name'])
            ->map(static fn (User $student): array => [
                'id' => (int) $student->getKey(),
                'name' => (string) $student->name,
                'can_draw' => (bool) $student->pivot->can_draw,
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
        if ($role === ClassroomAccess::ROLE_HOST) {
            return route('instructor.classes.show', ['classroom' => $classroom->getKey()]);
        }

        return route('student.home');
    }
}
