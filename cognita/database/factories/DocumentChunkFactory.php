<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\DocumentChunk;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Embeddings are deliberately NOT seeded here: `chunk_embeddings.embedding` is
 * a raw pgvector column written only via ChunkEmbedding::store().
 *
 * @extends Factory<DocumentChunk>
 */
class DocumentChunkFactory extends Factory
{
    /** @var class-string<DocumentChunk> */
    protected $model = DocumentChunk::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $sourceName = $this->faker->slug(2).'.pdf';

        return [
            'course_id' => Course::factory(),
            'uploaded_by' => User::factory()->instructor(),
            'source_name' => $sourceName,
            'chunk_index' => $this->faker->numberBetween(0, 50),
            'content' => $this->faker->paragraphs(3, true),
            'metadata' => [
                'source' => $sourceName,
                'page' => $this->faker->numberBetween(1, 40),
                'tokens' => $this->faker->numberBetween(80, 400),
            ],
        ];
    }

    public function forCourse(?Course $course = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'course_id' => $course?->getKey() ?? Course::factory(),
        ]);
    }
}
