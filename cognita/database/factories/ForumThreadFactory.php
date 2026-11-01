<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ForumStatus;
use App\Models\Course;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ForumThread>
 */
class ForumThreadFactory extends Factory
{
    /** @var class-string<ForumThread> */
    protected $model = ForumThread::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $body = $this->faker->paragraphs(2, true);

        return [
            'course_id' => Course::factory(),
            'user_id' => User::factory()->student(),
            'title' => Str::title(rtrim($this->faker->sentence(7), '.')),
            'body' => $body,
            'status' => ForumStatus::Open,
            'removed_by' => null,
            'removal_reason' => null,
        ];
    }

    public function locked(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ForumStatus::Locked,
        ]);
    }

    public function removed(?User $removedBy = null, ?string $reason = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ForumStatus::Removed,
            'removed_by' => $removedBy?->getKey() ?? User::factory()->moderator(),
            'removal_reason' => $reason ?? 'Removed for violating community guidelines.',
        ]);
    }

    public function inCourse(?Course $course = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'course_id' => $course?->getKey() ?? Course::factory(),
        ]);
    }
}
