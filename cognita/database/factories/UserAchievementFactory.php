<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Achievement;
use App\Models\User;
use App\Models\UserAchievement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Unique(user_id, achievement_id): each instance awards a fresh achievement.
 *
 * @extends Factory<UserAchievement>
 */
class UserAchievementFactory extends Factory
{
    /** @var class-string<UserAchievement> */
    protected $model = UserAchievement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->student(),
            'achievement_id' => Achievement::factory(),
            'earned_at' => now(),
        ];
    }

    public function forUser(?User $user = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'user_id' => $user?->getKey() ?? User::factory()->student(),
        ]);
    }

    public function forAchievement(?Achievement $achievement = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'achievement_id' => $achievement?->getKey() ?? Achievement::factory(),
        ]);
    }
}
