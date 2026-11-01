<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ModerationAction as ModerationActionEnum;
use App\Models\ModerationAction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * `moderation_actions` has no `updated_at` (the model sets $timestamps=false),
 * so the factory supplies `created_at` itself.
 *
 * @extends Factory<ModerationAction>
 */
class ModerationActionFactory extends Factory
{
    /** @var class-string<ModerationAction> */
    protected $model = ModerationAction::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'target_user_id' => User::factory()->student(),
            'actor_id' => User::factory()->moderator(),
            'action' => $this->faker->randomElement([
                ModerationActionEnum::Warn,
                ModerationActionEnum::Suspend,
                ModerationActionEnum::Ban,
            ]),
            'reason' => $this->faker->sentence(10),
            'expires_at' => null,
            'created_at' => now(),
        ];
    }

    public function warn(): static
    {
        return $this->state(fn (array $attributes): array => [
            'action' => ModerationActionEnum::Warn,
            'expires_at' => null,
        ]);
    }

    /**
     * Time-boxed suspension: the expiry is required to be meaningful.
     */
    public function suspend(int $days = 7): static
    {
        return $this->state(fn (array $attributes): array => [
            'action' => ModerationActionEnum::Suspend,
            'expires_at' => now()->addDays($days),
        ]);
    }

    public function ban(): static
    {
        return $this->state(fn (array $attributes): array => [
            'action' => ModerationActionEnum::Ban,
            'expires_at' => null,
        ]);
    }

    public function unban(): static
    {
        return $this->state(fn (array $attributes): array => [
            'action' => ModerationActionEnum::Unban,
            'expires_at' => null,
        ]);
    }

    public function restore(): static
    {
        return $this->state(fn (array $attributes): array => [
            'action' => ModerationActionEnum::Restore,
            'expires_at' => null,
        ]);
    }

    public function on(?User $target = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'target_user_id' => $target?->getKey() ?? User::factory()->student(),
        ]);
    }

    public function by(?User $actor = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'actor_id' => $actor?->getKey() ?? User::factory()->moderator(),
        ]);
    }
}
