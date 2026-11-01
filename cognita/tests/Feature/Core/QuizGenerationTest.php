<?php

declare(strict_types=1);

namespace Tests\Feature\Core;

use App\Ai\Agents\QuizGenerationAgent;
use App\Enums\ContentType;
use App\Models\Course;
use App\Models\DocumentChunk;
use App\Models\KnowledgeComponent;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Services\QuizGenerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature test 2 — structured-output quiz generation, persisted on the lesson.
 */
class QuizGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_quiz_is_generated_with_the_structured_schema_and_persisted(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create(['created_by' => $admin->getKey()]);
        $module = Module::factory()->create(['course_id' => $course->getKey(), 'sequence_order' => 1]);
        $lesson = Lesson::factory()->create([
            'module_id' => $module->getKey(),
            'title' => 'Photosynthesis',
            'sequence_order' => 1,
        ]);
        $component = KnowledgeComponent::factory()->create(['course_id' => $course->getKey()]);
        $lesson->knowledgeComponents()->attach($component->getKey());

        DocumentChunk::query()->create([
            'course_id' => $course->getKey(),
            'uploaded_by' => $admin->getKey(),
            'source_name' => 'biology-notes.txt',
            'chunk_index' => 0,
            'content' => 'Photosynthesis converts light energy into chemical energy in chloroplasts.',
            'metadata' => ['source' => 'biology-notes.txt'],
        ]);

        QuizGenerationAgent::fake([[
            'questions' => [
                [
                    'question' => 'Where does photosynthesis take place?',
                    'options' => ['Chloroplasts', 'Mitochondria', 'Nucleus', 'Ribosome'],
                    'correct_option_index' => 0,
                    'explanation' => 'Chloroplasts contain the photosynthetic machinery.',
                    'difficulty' => 'easy',
                    'knowledge_component' => 'Photosynthesis',
                ],
                [
                    'question' => 'Photosynthesis converts light energy into what?',
                    'options' => ['Chemical energy', 'Sound', 'Kinetic energy', 'Heat'],
                    'correct_option_index' => 0,
                    'explanation' => 'Light energy is stored as chemical energy.',
                    'difficulty' => 'medium',
                    'knowledge_component' => 'Photosynthesis',
                ],
            ],
        ]]);

        $result = app(QuizGenerationService::class)->generate($lesson, 2);

        $this->assertCount(2, $result['questions']);
        $this->assertGreaterThanOrEqual(1, $result['grounding_chunks']);

        $lesson->refresh();
        $this->assertSame(ContentType::Quiz, $lesson->content_type);

        /** @var array{questions: list<array<string, mixed>>} $payload */
        $payload = json_decode((string) $lesson->content_body, true);

        $this->assertCount(2, $payload['questions']);
        $this->assertCount(4, $payload['questions'][0]['options']);
        $this->assertSame(0, $payload['questions'][0]['correct_option_index']);
        $this->assertSame('Chloroplasts', $payload['questions'][0]['options'][0]);
    }

    public function test_questions_with_an_invalid_shape_are_discarded(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create(['created_by' => $admin->getKey()]);
        $module = Module::factory()->create(['course_id' => $course->getKey(), 'sequence_order' => 1]);
        $lesson = Lesson::factory()->create(['module_id' => $module->getKey(), 'sequence_order' => 1]);

        DocumentChunk::query()->create([
            'course_id' => $course->getKey(),
            'uploaded_by' => $admin->getKey(),
            'source_name' => 'notes.txt',
            'chunk_index' => 0,
            'content' => 'Some grounded material about ecosystems.',
            'metadata' => [],
        ]);

        QuizGenerationAgent::fake([[
            'questions' => [
                [
                    'question' => 'Broken question with three options',
                    'options' => ['A', 'B', 'C'],
                    'correct_option_index' => 0,
                    'explanation' => 'n/a',
                    'difficulty' => 'easy',
                    'knowledge_component' => 'Ecosystems',
                ],
                [
                    'question' => 'Valid question',
                    'options' => ['A', 'B', 'C', 'D'],
                    'correct_option_index' => 3,
                    'explanation' => 'n/a',
                    'difficulty' => 'easy',
                    'knowledge_component' => 'Ecosystems',
                ],
            ],
        ]]);

        $result = app(QuizGenerationService::class)->generate($lesson, 2);

        $this->assertCount(1, $result['questions']);
        $this->assertSame('Valid question', $result['questions'][0]['question']);
    }
}
