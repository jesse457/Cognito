<?php

declare(strict_types=1);

namespace App\Http\Resources\Community;

use App\Models\ForumPost;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ForumPost
 */
class PostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $post = $this->resource;
        $viewer = $request->user();

        return [
            'id' => $post->id,
            'thread_id' => $post->thread_id,
            'parent_post_id' => $post->parent_post_id,
            'body' => $post->body,
            'status' => $post->status->value,
            'author' => $this->author(),
            'can' => [
                'update' => $viewer !== null && $viewer->getKey() === $post->user_id,
                'delete' => $viewer !== null && $viewer->getKey() === $post->user_id,
            ],
            'created_at' => $post->created_at?->toIso8601String(),
            'updated_at' => $post->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function author(): ?array
    {
        $post = $this->resource;

        if (! $post->relationLoaded('user') || $post->user === null) {
            return null;
        }

        return [
            'id' => $post->user->id,
            'name' => $post->user->displayLabel(),
            'avatar_url' => $post->user->avatar_url,
        ];
    }
}
