<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\KtEngine;
use App\Models\KnowledgeComponent;
use App\Models\StudentKcMastery;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * Unique(user_id, knowledge_component_id) is a hard DB constraint, so calling
 * `create()` twice with the same pair would fail. The `forUserAndComponent()`
 * helper is the supported way to target a specific student/KC pair; the plain
 * factory always builds a fresh student or component for each row.
 *
 * @extends Factory<StudentKcMastery>
 */
class StudentKcMasteryFactory extends Factory
{
    /** @var class-string<StudentKcMastery> */
    protected $model = StudentKcMastery::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->student(),
            'knowledge_component_id' => KnowledgeComponent::factory(),
            'mastery_probability' => $this->faker->randomFloat(4, 0.05, 0.95),
            'model_used' => KtEngine::Bkt,
            'last_updated' => now(),
        ];
    }

    public function mastered(): static
    {
        return $this->state(fn (array $attributes): array => [
            'mastery_probability' => $this->faker->randomFloat(4, 0.85, 0.99),
        ]);
    }

    /**
     * Below the at-risk threshold (default 0.6) so dashboards have something to flag.
     */
    public function atRisk(): static
    {
        return $this->state(fn (array $attributes): array => [
            'mastery_probability' => $this->faker->randomFloat(4, 0.01, 0.4),
        ]);
    }

    /**
     * Target an existing student/KC pair. Callers that need idempotency should
     * use `updateOrCreate` themselves (unique user_id + knowledge_component_id).
     */
    public function forUserAndComponent(User $user, KnowledgeComponent $component): static
    {
        return $this->state(fn (array $attributes): array => [
            'user_id' => $user->getKey(),
            'knowledge_component_id' => $component->getKey(),
        ]);
    }

    public function forUser(?User $user = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'user_id' => $user?->getKey() ?? User::factory()->student(),
        ]);
    }

    public function forComponent(?KnowledgeComponent $component = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'knowledge_component_id' => $component?->getKey() ?? KnowledgeComponent::factory(),
        ]);
    }

    public function withEngine(KtEngine $engine): static
    {
        return $this->state(fn (array $attributes): array => [
            'model_used' => $engine,
        ]);
    }

    /**
     * Swap in a fresh knowledge component when the resolved pair already has a
     * row, so a repeated `->create()` never trips unique(user_id, kc_id).
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create($attributes = [], ?Model $parent = null): StudentKcMastery
    {
        /** @var array<string, mixed> $resolved */
        $resolved = $this->expandAttributes($this->state($attributes)->getRawAttributes($parent));

        if ($this->pairAlreadyPersisted($resolved['user_id'] ?? null, $resolved['knowledge_component_id'] ?? null)) {
            /** @var KnowledgeComponent $replacement */
            $replacement = KnowledgeComponent::factory()->create();
            $resolved['knowledge_component_id'] = $replacement->getKey();
        }

        /** @var StudentKcMastery $mastery */
        $mastery = StudentKcMastery::query()->create($resolved);

        return $mastery;
    }

    private function pairAlreadyPersisted(mixed $userId, mixed $componentId): bool
    {
        if (! is_int($userId) && ! is_string($userId)) {
            return false;
        }

        if (! is_int($componentId) && ! is_string($componentId)) {
            return false;
        }

        return StudentKcMastery::query()
            ->where('user_id', $userId)
            ->where('knowledge_component_id', $componentId)
            ->exists();
    }
}
