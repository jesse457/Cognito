<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ParticipantProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * `participant_profiles.user_id` is unique — one profile per user.
 *
 * @extends Factory<ParticipantProfile>
 */
class ParticipantProfileFactory extends Factory
{
    /** @var class-string<ParticipantProfile> */
    protected $model = ParticipantProfile::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $totalXp = $this->faker->numberBetween(0, 5_000);

        return [
            'user_id' => User::factory()->student(),
            'total_xp' => $totalXp,
            // Mirror the gamification rule: one level per 500 XP.
            'current_level' => (int) floor($totalXp / 500) + 1,
            'current_streak' => $this->faker->numberBetween(0, 30),
            'last_activity_date' => now()->subDays($this->faker->numberBetween(0, 14))->toDateString(),
        ];
    }

    public function forUser(?User $user = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'user_id' => $user?->getKey() ?? User::factory()->student(),
        ]);
    }

    public function newJoin(): static
    {
        return $this->state(fn (array $attributes): array => [
            'total_xp' => 0,
            'current_level' => 1,
            'current_streak' => 0,
            'last_activity_date' => null,
        ]);
    }
}
