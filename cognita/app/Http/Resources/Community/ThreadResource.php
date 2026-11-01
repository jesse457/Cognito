<?php

declare(strict_types=1);

namespace App\Http\Resources\Community;

use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ForumThread
 */
class ThreadResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $thread = $this->resource;

        return [
            'id' => $thread->id,
            'course_id' => $thread->course_id,
            'title' => $thread->title,
            'body' => $thread->body,
            'status' => $thread->status->value,
            'is_locked' => $thread->isLocked(),
            'author' => $this->author(),
            'posts_count' => $this->postsCount(),
            'last_activity_at' => $this->lastActivityAt(),
            'created_at' => $thread->created_at?->toIso8601String(),
            'updated_at' => $thread->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Author block, omitted entirely when the relation was not loaded so a
     * list response never leaks an extra N+1.
     *
     * @return array<string, mixed>|null
     */
    private function author(): ?array
    {
        $thread = $this->resource;

        if (! $thread->relationLoaded('user')) {
            return null;
        }

        return $this->userSummary($thread->user);
    }

    /** Counts come from `withCount` on the list/show queries. */
    private function postsCount(): int
    {
        $count = $this->resource->getAttribute('visible_posts_count');

        return is_numeric($count) ? (int) $count : 0;
    }

    private function lastActivityAt(): ?string
    {
        $thread = $this->resource;

        if (! $thread->relationLoaded('posts') || $thread->posts->isEmpty()) {
            return $thread->updated_at?->toIso8601String();
        }

        return $thread->posts->max('created_at')?->toIso8601String();
    }

    /** @return array<string, mixed>|null */
    private function userSummary(?User $user): ?array
    {
        if ($user === null) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->displayLabel(),
            'avatar_url' => $user->avatar_url,
        ];
    }
}
