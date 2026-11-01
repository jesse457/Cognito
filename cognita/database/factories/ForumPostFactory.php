<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PostStatus;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ForumPost>
 */
class ForumPostFactory extends Factory
{
    /** @var class-string<ForumPost> */
    protected $model = ForumPost::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'thread_id' => ForumThread::factory(),
            'user_id' => User::factory()->student(),
            'parent_post_id' => null,
            'body' => $this->faker->paragraphs(2, true),
            'status' => PostStatus::Visible,
            'hidden_by' => null,
        ];
    }

    public function inThread(?ForumThread $thread = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'thread_id' => $thread?->getKey() ?? ForumThread::factory(),
        ]);
    }

    /**
     * Reply to an existing post; the thread is inherited from the parent.
     */
    public function replyTo(ForumPost $parent): static
    {
        return $this->state(fn (array $attributes): array => [
            'thread_id' => $parent->thread_id,
            'parent_post_id' => $parent->getKey(),
        ]);
    }

    public function hidden(?User $hiddenBy = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => PostStatus::Hidden,
            'hidden_by' => $hiddenBy?->getKey() ?? User::factory()->moderator(),
        ]);
    }

    public function removed(?User $hiddenBy = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => PostStatus::Removed,
            'hidden_by' => $hiddenBy?->getKey() ?? User::factory()->moderator(),
        ]);
    }
}
