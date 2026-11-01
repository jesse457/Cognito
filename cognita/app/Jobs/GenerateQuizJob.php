<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Lesson;
use App\Services\QuizGenerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Queue wrapper around QuizGenerationService (LLM call — never synchronous).
 */
class GenerateQuizJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120, 300];

    public function __construct(
        public readonly int $lessonId,
        public readonly int $questionCount = 5,
    ) {}

    public function handle(QuizGenerationService $quizzes): void
    {
        $lesson = Lesson::query()->find($this->lessonId);

        if ($lesson === null) {
            Log::warning('quiz.lesson_missing', ['lesson_id' => $this->lessonId]);

            return;
        }

        $result = $quizzes->generate($lesson, $this->questionCount);

        Log::info('quiz.job_completed', [
            'lesson_id' => $this->lessonId,
            'question_count' => count($result['questions']),
        ]);
    }
}
