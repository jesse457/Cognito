<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Achievement;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * `achievements.slug` is unique — unique words keep the default slug distinct.
 *
 * @extends Factory<Achievement>
 */
class AchievementFactory extends Factory
{
    /** @var class-string<Achievement> */
    protected $model = Achievement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title($this->faker->unique()->words(3, true));

        return [
            'slug' => Str::slug($name, '_'),
            'name' => $name,
            'description' => $this->faker->sentence(12),
            'criteria' => [
                'type' => 'quiz_completed',
                'count' => $this->faker->numberBetween(1, 20),
            ],
        ];
    }

    public function streak(int $days = 7): static
    {
        return $this->state(fn (array $attributes): array => [
            'criteria' => ['type' => 'streak', 'days' => $days],
        ]);
    }

    public function quizCompleted(int $count = 1): static
    {
        return $this->state(fn (array $attributes): array => [
            'criteria' => ['type' => 'quiz_completed', 'count' => $count],
        ]);
    }
}
