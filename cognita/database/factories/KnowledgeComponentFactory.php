<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\KnowledgeComponent;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<KnowledgeComponent>
 */
class KnowledgeComponentFactory extends Factory
{
    /** @var class-string<KnowledgeComponent> */
    protected $model = KnowledgeComponent::class;

    /**
     * `knowledge_components.slug` only carries a plain index (scoped to the
     * course in practice), so the default slug is made unique per factory run.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title($this->faker->unique()->words(2, true));

        return [
            'course_id' => Course::factory(),
            'name' => $name,
            'description' => $this->faker->sentence(12),
            'slug' => Str::slug($name).'-'.$this->faker->unique()->numberBetween(1, 999_999),
        ];
    }

    public function forCourse(?Course $course = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'course_id' => $course?->getKey() ?? Course::factory(),
        ]);
    }
}
