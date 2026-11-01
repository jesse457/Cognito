<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\AdminAuditLog;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * Append-only audit row. The model has UPDATED_AT = null and refuses updates
 * and deletes, so the factory only ever creates.
 *
 * `context` is required JSON and must never be an empty object — the audit
 * contract enforced by AuditLogService::normaliseContext().
 *
 * @extends Factory<AdminAuditLog>
 */
class AdminAuditLogFactory extends Factory
{
    /** @var class-string<AdminAuditLog> */
    protected $model = AdminAuditLog::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $target = Course::factory();

        return [
            'actor_id' => User::factory()->admin(),
            'actor_role' => UserRole::Admin->value,
            'action' => 'course.update',
            'target_type' => 'course',
            'target_id' => $target,
            'context' => [
                'event' => 'updated',
                'changes' => [
                    'status' => ['old' => 'draft', 'new' => 'published'],
                ],
                'reason' => $this->faker->sentence(8),
            ],
            'ip_address' => $this->faker->ipv4(),
            'user_agent' => $this->faker->userAgent(),
            'created_at' => now(),
        ];
    }

    /**
     * Audit row for a concrete target; the alias is taken from the configured
     * morph map so `target_type` always matches what AuditLogService writes.
     */
    public function forTarget(Model $target, string $action = 'course.update'): static
    {
        return $this->state(fn (array $attributes): array => [
            'action' => $action,
            'target_type' => $this->aliasFor($target),
            'target_id' => $target->getKey(),
        ]);
    }

    public function by(?User $actor = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'actor_id' => $actor?->getKey() ?? User::factory()->admin(),
            'actor_role' => $actor?->role->value ?? UserRole::Admin->value,
        ]);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function withContext(array $context): static
    {
        return $this->state(fn (array $attributes): array => [
            'context' => $context,
        ]);
    }

    private function aliasFor(Model $target): string
    {
        $alias = array_search($target::class, config('cognita.morph_map', []), true);

        return is_string($alias) ? $alias : (string) $target->getMorphClass();
    }
}
