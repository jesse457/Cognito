<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\User;
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
 * with the class key. The token endpoint mints a short-lived, voice-scoped
 * LiveKit grant for the same caller; the page requests it after the Join
 * button is pressed so the microphone prompt stays tied to a user gesture.
 */
class LiveCallController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly LiveKit $liveKit,
    ) {}

    public function show(Request $request, Classroom $classroom): Response
    {
        /** @var User $user */
        $user = $request->user();

        ['role' => $role] = $this->access->assertCanJoinCall($user, $classroom);

        $board = $classroom->board()->firstOrCreate([], [
            'surface' => 'canvas',
            'title' => 'Canvas',
        ]);

        return Inertia::render('LiveCall/Room', [
            'classroom' => [
                'id' => (int) $classroom->getKey(),
                'name' => $classroom->name,
                'join_code' => $classroom->join_code,
                'course' => $classroom->course?->title,
                'instructor' => $classroom->instructor?->name,
            ],
            'role' => $role,
            'board' => $board->state(),
            'canEditBoard' => $role === ClassroomAccess::ROLE_HOST || $board->students_can_annotate,
            'canManageBoard' => $role === ClassroomAccess::ROLE_HOST,
            'room' => $classroom->roomName(),
            'configured' => $this->liveKit->configured(),
            'tokenUrl' => route('call.token', ['classroom' => $classroom->getKey()]),
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

        return response()->json([
            'data' => $this->liveKit->token($user, $classroom, $role),
        ]);
    }

    private function backUrl(string $role, Classroom $classroom): string
    {
        if ($role === ClassroomAccess::ROLE_HOST) {
            return route('instructor.classes.show', ['classroom' => $classroom->getKey()]);
        }

        return route('student.home');
    }
}
