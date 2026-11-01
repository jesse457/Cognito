<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\LeaderboardPeriod;
use App\Models\Course;
use App\Models\LeaderboardEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Unique(course_id, user_id, period): every factory instance gets a new student
 * and course, so repeated creates never collide.
 *
 * @extends Factory<LeaderboardEntry>
 */
class LeaderboardEntryFactory extends Factory
{
    /** @var class-string<LeaderboardEntry> */
    protected $model = LeaderboardEntry::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'user_id' => User::factory()->student(),
            'score' => $this->faker->numberBetween(0, 1_000),
            'rank' => null,
            'period' => LeaderboardPeriod::Weekly,
        ];
    }

    public function weekly(): static
    {
        return $this->state(fn (array $attributes): array => [
            'period' => LeaderboardPeriod::Weekly,
        ]);
    }

    public function allTime(): static
    {
        return $this->state(fn (array $attributes): array => [
            'period' => LeaderboardPeriod::AllTime,
        ]);
    }

    public function forCourse(?Course $course = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'course_id' => $course?->getKey() ?? Course::factory(),
        ]);
    }

    public function ranked(int $rank): static
    {
        return $this->state(fn (array $attributes): array => [
            'rank' => $rank,
        ]);
    }
}
