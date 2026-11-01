<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ContentType;
use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Lesson>
 */
class LessonFactory extends Factory
{
    /** @var class-string<Lesson> */
    protected $model = Lesson::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $contentType = $this->faker->randomElement(ContentType::cases());

        return [
            'module_id' => Module::factory(),
            'title' => Str::title($this->faker->unique()->words(4, true)),
            'content_type' => $contentType,
            'content_url' => $contentType === ContentType::Video ? 'https://videos.cognita.test/'.$this->faker->uuid().'.mp4' : null,
            'content_body' => $contentType === ContentType::Video ? null : $this->faker->paragraphs(3, true),
            'sequence_order' => $this->faker->numberBetween(1, 10),
        ];
    }

    public function text(): static
    {
        return $this->state(fn (array $attributes): array => [
            'content_type' => ContentType::Text,
            'content_url' => null,
            'content_body' => $this->faker->paragraphs(3, true),
        ]);
    }

    public function video(): static
    {
        return $this->state(fn (array $attributes): array => [
            'content_type' => ContentType::Video,
            'content_url' => 'https://videos.cognita.test/'.$this->faker->uuid().'.mp4',
            'content_body' => null,
        ]);
    }

    public function quiz(): static
    {
        return $this->state(fn (array $attributes): array => [
            'content_type' => ContentType::Quiz,
            'content_url' => null,
            'content_body' => $this->faker->paragraph(),
        ]);
    }

    /**
     * Append the lesson after every existing lesson of its module.
     */
    public function nextInModule(): static
    {
        return $this->state(function (array $attributes): array {
            $moduleId = $attributes['module_id'] ?? null;

            if (! is_int($moduleId) && ! is_string($moduleId)) {
                return [];
            }

            return [
                'sequence_order' => ((int) Lesson::query()->where('module_id', $moduleId)->max('sequence_order')) + 1,
            ];
        });
    }
}
