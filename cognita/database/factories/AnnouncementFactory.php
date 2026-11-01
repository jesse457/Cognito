<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    /** @var class-string<Announcement> */
    protected $model = Announcement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'class_id' => PrivateClass::factory(),
            'instructor_id' => User::factory()->instructor(),
            'title' => Str::title(rtrim($this->faker->sentence(6), '.')),
            'body' => $this->faker->paragraphs(2, true),
            'published_at' => now(),
        ];
    }

    public function forClass(?PrivateClass $class = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'class_id' => $class?->getKey() ?? PrivateClass::factory(),
        ]);
    }

    public function scheduled(): static
    {
        return $this->state(fn (array $attributes): array => [
            'published_at' => now()->addDays(3),
        ]);
    }
}
