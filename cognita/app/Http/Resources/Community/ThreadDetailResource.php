<?php

declare(strict_types=1);

namespace App\Http\Resources\Community;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * A thread plus its posts, each post carrying its one-level replies nested
 * under `children`. Hidden/removed posts are filtered by the query layer; a
 * moderator sees them here because the threading keeps the flag.
 *
 * @mixin ForumThread
 */
class ThreadDetailResource extends JsonResource
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
            'author' => $this->author($thread->user),
            'posts_count' => $this->postsCount(),
            'created_at' => $thread->created_at?->toIso8601String(),
            'updated_at' => $thread->updated_at?->toIso8601String(),
            'posts' => $this->posts($request),
        ];
    }

    /**
     * Top-level posts in creation order, each with its replies.
     *
     * @return list<array<string, mixed>>
     */
    private function posts(Request $request): array
    {
        $thread = $this->resource;

        if (! $thread->relationLoaded('posts')) {
            return [];
        }

        $all = $thread->posts;

        return $all
            ->whereNull('parent_post_id')
            ->sortBy('created_at')
            ->values()
            ->map(fn (ForumPost $post): array => $this->withReplies($post, $all, $request))
            ->all();
    }

    /**
     * @param  Collection<int, ForumPost>  $all
     * @return array<string, mixed>
     */
    private function withReplies(ForumPost $post, Collection $all, Request $request): array
    {
        $payload = (new PostResource($post))->toArray($request);

        $payload['children'] = $all
            ->where('parent_post_id', $post->getKey())
            ->sortBy('created_at')
            ->values()
            ->map(static fn (ForumPost $reply): array => (new PostResource($reply))->toArray($request))
            ->all();

        return $payload;
    }

    private function postsCount(): int
    {
        $count = $this->resource->getAttribute('visible_posts_count');

        return is_numeric($count) ? (int) $count : 0;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function author(?User $user): ?array
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
