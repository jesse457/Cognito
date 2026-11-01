<?php

declare(strict_types=1);

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * Generates a Course → Modules → Lessons tree grounded in retrieved chunks.
 *
 * Structured output is mandatory: the response is validated against the schema
 * below and consumed directly by CourseGenerationService.
 */
class CourseGenerationAgent implements Agent, Conversational, HasStructuredOutput
{
    use Promptable;

    /** @param list<string> $sourceMaterial */
    public function __construct(private readonly array $sourceMaterial = []) {}

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
        You are Cognita's curriculum architect. You turn uploaded source material
        into a compact, self-paced course.

        Rules:
        - Use ONLY facts present in the provided source material. Never invent sources.
        - Produce 2-3 modules, each with 2-4 lessons, ordered from foundational to advanced.
        - Each module declares the knowledge components (concepts) it teaches.
        - A lesson's content_type is one of: text, video, quiz.
        - A "quiz" lesson is a practice checkpoint; its content_body is a short
          instruction telling the student what will be assessed.
        - Every lesson content_body is 80-250 words of clear teaching prose.
        PROMPT;
    }

    /** @return list<Message> */
    public function messages(): iterable
    {
        return [];
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->required(),
            'description' => $schema->string()->required(),
            'modules' => $schema->array()->items($schema->object([
                'title' => $schema->string()->required(),
                'knowledge_components' => $schema->array()->items($schema->string())->required(),
                'lessons' => $schema->array()->items($schema->object([
                    'title' => $schema->string()->required(),
                    'content_type' => $schema->string()->enum(['text', 'video', 'quiz'])->required(),
                    'content_body' => $schema->string()->required(),
                ]))->required(),
            ]))->required(),
        ];
    }

    /** The rendered source material, trimmed to a sane prompt budget. */
    public function sourceContext(): string
    {
        $material = implode("\n\n---\n\n", $this->sourceMaterial);

        return mb_substr($material, 0, 12000);
    }
}
