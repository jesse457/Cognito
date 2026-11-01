<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StartPracticeSessionRequest;
use App\Http\Requests\Student\SubmitAnswerRequest;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\PracticeSession;
use App\Models\User;
use App\Services\PracticeSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PracticeSessionController extends Controller
{
    public function __construct(private readonly PracticeSessionService $sessions) {}

    public function store(StartPracticeSessionRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $course = Course::query()->findOrFail($request->integer('course_id'));
        $lesson = $request->filled('lesson_id')
            ? Lesson::query()->findOrFail($request->integer('lesson_id'))
            : null;

        $session = $this->sessions->start($user, $course, $lesson);

        return response()->json([
            'data' => [
                'session_id' => $session->getKey(),
                'course_id' => $session->course_id,
                'lesson_id' => $session->lesson_id,
                'started_at' => $session->started_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function answer(SubmitAnswerRequest $request, PracticeSession $session): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $answer = $this->sessions->submitAnswer($user, $session, $request->validated());

        return response()->json([
            'data' => [
                'answer_id' => $answer->getKey(),
                'is_correct' => $answer->is_correct,
                'knowledge_component_id' => $answer->knowledge_component_id,
                'time_taken_ms' => $answer->time_taken_ms,
            ],
        ], 201);
    }

    public function complete(Request $request, PracticeSession $session): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $this->sessions->complete($user, $session)]);
    }
}
