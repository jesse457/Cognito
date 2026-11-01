<?php

declare(strict_types=1);

namespace App\Services;

use App\Ai\Agents\QuizGenerationAgent;
use App\Enums\ContentType;
use App\Models\Lesson;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Grounded quiz generation.
 *
 * The structured-output schema is the persisted question contract; each question
 * is validated here (four options, in-range answer index) before being written to
 * `lessons.content_body` as JSON. Cognita has no separate quizzes table — a quiz
 * is a lesson whose content_type is `quiz` and whose body holds the question set.
 */
class QuizGenerationService
{
    public function __construct(private readonly RagIngestionService $rag) {}

    /**
     * @return array{lesson_id:int, questions:list<array<string,mixed>>, grounding_chunks:int, engine:string}
     */
    public function generate(Lesson $lesson, int $questionCount = 5): array
    {
        $lesson->loadMissing('module.course', 'knowledgeComponents');

        $courseId = $lesson->module?->course_id;
        $componentNames = $lesson->knowledgeComponents->pluck('name')->implode(', ');
        $query = trim($lesson->title.' '.$componentNames);

        $sourceMaterial = $courseId === null
            ? []
            : $this->rag->retrieveForCourse((int) $courseId, $query, (int) config('cognita.rag.top_k', 8));

        if ($sourceMaterial === []) {
            throw new RuntimeException("Lesson {$lesson->getKey()} has no source material to ground questions in.");
        }

        $agent = new QuizGenerationAgent($sourceMaterial);

        $prompt = implode("\n", array_filter([
            "Lesson: {$lesson->title}",
            $componentNames !== '' ? "Knowledge components: {$componentNames}" : null,
            "Generate {$questionCount} questions grounded ONLY in the source material below.",
            "\n<source_material>\n".$agent->sourceContext()."\n</source_material>",
        ]));

        $response = $agent->prompt($prompt);
        $questions = $this->normaliseQuestions($this->structuredPayload($response));

        if ($questions === []) {
            throw new RuntimeException('The AI provider returned no usable questions.');
        }

        $lesson->update([
            'content_type' => ContentType::Quiz,
            'content_body' => json_encode([
                'questions' => $questions,
                'generated_at' => now()->toIso8601String(),
                'grounded_in' => count($sourceMaterial),
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        ]);

        Log::info('quiz.generated', [
            'lesson_id' => $lesson->getKey(),
            'course_id' => $courseId,
            'question_count' => count($questions),
            'grounding_chunks' => count($sourceMaterial),
        ]);

        return [
            'lesson_id' => $lesson->getKey(),
            'questions' => $questions,
            'grounding_chunks' => count($sourceMaterial),
            'engine' => (string) config('features.kt_engine'),
        ];
    }

    /** @return array<string, mixed> */
    private function structuredPayload(mixed $response): array
    {
        $structured = $response->structured ?? null;

        if (is_array($structured)) {
            return $structured;
        }

        $decoded = json_decode((string) ($response->text ?? ''), true);

        if (! is_array($decoded)) {
            throw new RuntimeException('The AI provider returned an unusable quiz payload.');
        }

        return $decoded;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<array<string, mixed>>
     */
    private function normaliseQuestions(array $payload): array
    {
        $questions = [];

        foreach ((array) ($payload['questions'] ?? []) as $index => $question) {
            $options = array_values(array_map(
                static fn (mixed $option): string => trim((string) $option),
                (array) ($question['options'] ?? []),
            ));

            if (count($options) !== 4) {
                continue;
            }

            $correct = (int) ($question['correct_option_index'] ?? -1);

            if ($correct < 0 || $correct > 3) {
                continue;
            }

            $questions[] = [
                'id' => 'q'.($index + 1),
                'question' => (string) ($question['question'] ?? ''),
                'options' => $options,
                'correct_option_index' => $correct,
                'explanation' => (string) ($question['explanation'] ?? ''),
                'difficulty' => (string) ($question['difficulty'] ?? 'medium'),
                'knowledge_component' => (string) ($question['knowledge_component'] ?? ''),
            ];
        }

        return $questions;
    }
}
