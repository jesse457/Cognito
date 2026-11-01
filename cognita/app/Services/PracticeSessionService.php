<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\AnswerSubmitted;
use App\Events\QuizCompleted;
use App\Models\AnswerHistory;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\PracticeSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * The student practice/quiz loop: start a session, submit answers, complete it.
 *
 * Everything that involves the KT engine or an LLM is queued by the listeners
 * attached to the events dispatched here, so the student's request never waits
 * on external calls.
 */
class PracticeSessionService
{
    public function start(User $user, Course $course, ?Lesson $lesson = null): PracticeSession
    {
        $this->assertEnrolled($user, $course);

        if ($lesson !== null) {
            $lessonCourseId = $lesson->module?->course_id;

            if ($lessonCourseId !== null && (int) $lessonCourseId !== $course->getKey()) {
                throw ValidationException::withMessages([
                    'lesson_id' => 'That lesson does not belong to the selected course.',
                ]);
            }
        }

        $session = PracticeSession::query()->create([
            'user_id' => $user->getKey(),
            'course_id' => $course->getKey(),
            'lesson_id' => $lesson?->getKey(),
            'started_at' => now(),
        ]);

        Log::info('practice.started', [
            'session_id' => $session->getKey(),
            'user_id' => $user->getKey(),
            'course_id' => $course->getKey(),
            'lesson_id' => $lesson?->getKey(),
        ]);

        return $session;
    }

    /**
     * @param  array{
     *     question_payload?: array<string,mixed>,
     *     user_answer: array<string,mixed>,
     *     is_correct?: bool,
     *     time_taken_ms: int,
     *     knowledge_component_id?: int|null
     * }  $payload
     */
    public function submitAnswer(User $user, PracticeSession $session, array $payload): AnswerHistory
    {
        if ($session->user_id !== $user->getKey()) {
            abort(403, 'You may only answer within your own practice session.');
        }

        if ($session->isCompleted()) {
            throw ValidationException::withMessages([
                'session_id' => 'This practice session is already completed.',
            ]);
        }

        $lesson = $session->lesson;

        if ($lesson === null) {
            throw ValidationException::withMessages([
                'lesson_id' => 'This practice session is not attached to a lesson.',
            ]);
        }

        $componentId = $payload['knowledge_component_id']
            ?? $lesson->knowledgeComponents()->value('knowledge_components.id');

        $answer = DB::transaction(function () use ($session, $lesson, $payload, $componentId): AnswerHistory {
            $answer = AnswerHistory::query()->create([
                'user_id' => $session->user_id,
                'session_id' => $session->getKey(),
                'lesson_id' => $lesson->getKey(),
                'knowledge_component_id' => $componentId,
                'question_payload' => $payload['question_payload'] ?? [],
                'user_answer' => $payload['user_answer'],
                'is_correct' => $this->resolveCorrectness($payload),
                'time_taken_ms' => max(0, (int) $payload['time_taken_ms']),
            ]);

            return $answer;
        });

        AnswerSubmitted::dispatch($user, $session, $answer);

        return $answer;
    }

    /**
     * @return array{session_id:int, correct_count:int, total_count:int, completed_at:string}
     */
    public function complete(User $user, PracticeSession $session): array
    {
        if ($session->user_id !== $user->getKey()) {
            abort(403, 'You may only complete your own practice session.');
        }

        if ($session->isCompleted()) {
            throw ValidationException::withMessages([
                'session_id' => 'This practice session is already completed.',
            ]);
        }

        $session->forceFill(['completed_at' => now()])->save();

        $answers = $session->answers()->get();
        $correct = $answers->where('is_correct', true)->count();
        $total = $answers->count();

        $course = Course::query()->find($session->course_id);

        QuizCompleted::dispatch($user, $session, $course, $correct, $total);

        Log::info('practice.completed', [
            'session_id' => $session->getKey(),
            'user_id' => $user->getKey(),
            'course_id' => $session->course_id,
            'correct_count' => $correct,
            'total_count' => $total,
        ]);

        return [
            'session_id' => $session->getKey(),
            'correct_count' => $correct,
            'total_count' => $total,
            'completed_at' => (string) $session->completed_at?->toIso8601String(),
        ];
    }

    /** @param array<string, mixed> $payload */
    private function resolveCorrectness(array $payload): bool
    {
        $question = $payload['question_payload'] ?? [];
        $answer = $payload['user_answer'] ?? [];

        $correctIndex = $question['correct_option_index'] ?? null;
        $selectedIndex = $answer['selected_option_index'] ?? $answer['selected_option'] ?? null;

        if (is_numeric($correctIndex) && is_numeric($selectedIndex)) {
            return (int) $correctIndex === (int) $selectedIndex;
        }

        // Non-quiz practice (e.g. a text exercise) may report its own verdict;
        // quiz lessons always have a server-side correct index.
        return (bool) ($payload['is_correct'] ?? false);
    }

    private function assertEnrolled(User $user, Course $course): void
    {
        $enrolled = Enrollment::query()
            ->where('user_id', $user->getKey())
            ->where('course_id', $course->getKey())
            ->exists();

        if (! $enrolled) {
            abort(403, 'You must be enrolled in this course first.');
        }
    }
}
