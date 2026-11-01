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
 * Generates grounded multiple-choice questions for one lesson.
 *
 * This is Cognita's quiz engine: a structured-output agent whose schema is the
 * persisted question contract (question text, four options, correct index,
 * explanation, difficulty, and the knowledge component being assessed).
 */
class QuizGenerationAgent implements Agent, Conversational, HasStructuredOutput
{
    use Promptable;

    /** @param list<string> $sourceMaterial */
    public function __construct(private readonly array $sourceMaterial = []) {}

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
        You are Cognita's assessment author. You write multiple-choice questions
        strictly grounded in the supplied source material.

        Rules:
        - Exactly four options per question, exactly one correct option.
        - Never reference "the text" or option letters inside the question.
        - The explanation states why the correct answer is correct, in 1-3 sentences.
        - difficulty is one of: easy, medium, hard.
        - knowledge_component names the single concept the question assesses.
        - Do not repeat a question stem.
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
            'questions' => $schema->array()->items($schema->object([
                'question' => $schema->string()->required(),
                'options' => $schema->array()->items($schema->string())->required(),
                'correct_option_index' => $schema->integer()->required(),
                'explanation' => $schema->string()->required(),
                'difficulty' => $schema->string()->enum(['easy', 'medium', 'hard'])->required(),
                'knowledge_component' => $schema->string()->required(),
            ]))->required(),
        ];
    }

    public function sourceContext(): string
    {
        return mb_substr(implode("\n\n---\n\n", $this->sourceMaterial), 0, 12000);
    }
}
