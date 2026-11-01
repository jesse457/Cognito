<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /** @var class-string<User> */
    protected $model = User::class;

    /**
     * Define the model's default state.
     *
     * The `password` column carries the `hashed` cast on the model, so plain
     * text is hashed on assignment — never hash here or the value is hashed twice.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => 'password',
            'remember_token' => Str::random(10),
            'role' => UserRole::Student,
            'display_name' => null,
            'avatar_url' => null,
            'status' => UserStatus::Active,
            'suspended_until' => null,
            'last_seen_at' => null,
        ];
    }

    public function owner(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => UserRole::Owner,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => UserRole::Admin,
        ]);
    }

    public function moderator(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => UserRole::Moderator,
        ]);
    }

    public function instructor(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => UserRole::Instructor,
        ]);
    }

    public function student(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => UserRole::Student,
        ]);
    }

    /**
     * Active suspension that expires `$days` in the future.
     */
    public function suspended(int $days = 7): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => UserStatus::Suspended,
            'suspended_until' => now()->addDays($days),
        ]);
    }

    /**
     * Permanent ban: no `suspended_until`, the status does the blocking.
     */
    public function banned(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => UserStatus::Banned,
            'suspended_until' => null,
        ]);
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes): array => [
            'email_verified_at' => null,
        ]);
    }
}
