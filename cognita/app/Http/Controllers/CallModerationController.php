<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\RealtimeProvider;
use App\Models\Classroom;
use App\Models\User;
use App\Services\ClassroomAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Instructor moderation for a live class call.
 */
class CallModerationController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly RealtimeProvider $realtime,
    ) {}

    public function remove(Request $request, Classroom $classroom, string $identity): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->access->assertInstructorOwnsClassroom($user, $classroom);

        $studentId = $this->enrolledStudentId($classroom, $identity, 'removed');

        abort_if($studentId === (int) $user->getKey(), 403, 'You cannot remove yourself from your own class.');

        try {
            $this->realtime->removeParticipant($classroom, $identity, $request);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'message' => 'The participant could not be removed from the call server. Try again.',
            ], 502);
        }

        return response()->json([
            'data' => ['identity' => $identity, 'removed' => true],
        ]);
    }

    /**
     * The instructor's microphone gate for one student in the current call.
     *
     * The approval is live only: it changes the participant's permission at the
     * call server and is forgotten when they leave or rejoin.
     */
    public function permission(Request $request, Classroom $classroom, string $identity): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->access->assertInstructorOwnsClassroom($user, $classroom);

        $validated = $request->validate([
            'can_talk' => ['required', 'boolean'],
        ]);

        $studentId = $this->enrolledStudentId($classroom, $identity, 'changed');

        abort_if($studentId === (int) $user->getKey(), 403, 'You cannot change your own microphone permission.');

        $canTalk = (bool) $validated['can_talk'];

        try {
            $this->realtime->setMicrophonePermission($classroom, $identity, $canTalk, $request);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'message' => 'The microphone permission could not be changed at the call server. Try again.',
            ], 502);
        }

        return response()->json([
            'data' => ['identity' => $identity, 'can_talk' => $canTalk],
        ]);
    }

    private function enrolledStudentId(Classroom $classroom, string $identity, string $action): int
    {
        abort_unless(
            preg_match('/^user-(\d+)-[a-z0-9]{6,16}$/', $identity, $matches) === 1,
            422,
            "That participant cannot be {$action}.",
        );

        $studentId = (int) $matches[1];

        abort_unless(
            $classroom->enrollments()->where('student_id', $studentId)->exists(),
            404,
            'That participant is not enrolled in this class.',
        );

        return $studentId;
    }
}
