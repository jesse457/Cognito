<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Question;
use App\Models\User;
use App\Services\PostEmbedder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Ai\Embeddings;
use Laravel\Ai\Prompts\EmbeddingsPrompt;
use Tests\TestCase;

class PostEmbedderTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_uses_the_laravel_ai_sdk_when_a_provider_is_configured(): void
    {
        config()->set('embeddings.provider', 'openai');
        config()->set('embeddings.model', 'text-embedding-3-small');
        config()->set('embeddings.dimensions', 768);

        Embeddings::fake();

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $question = Question::factory()->create([
            'classroom_id' => $classroom->getKey(),
            'user_id' => $instructor->getKey(),
            'title' => 'Momentum after a collision',
            'body' => 'Use conservation of momentum.',
            'tags' => ['momentum'],
        ]);

        $this->assertDatabaseHas('post_embeddings', [
            'embeddable_type' => Question::class,
            'embeddable_id' => $question->getKey(),
        ]);

        Embeddings::assertGenerated(fn (EmbeddingsPrompt $prompt): bool => $prompt->dimensions === 768
            && $prompt->contains('Momentum after a collision'));
    }

    public function test_embedder_falls_back_locally_when_no_provider_key_is_configured(): void
    {
        config()->set('embeddings.provider', null);
        config()->set('ai.providers.openai.key', null);

        Embeddings::fake();

        $vector = app(PostEmbedder::class)->embed('normal force');

        $this->assertCount(768, $vector);
        $this->assertSame($vector, app(PostEmbedder::class)->embed('normal force'));
        Embeddings::assertNothingGenerated();
    }
}
