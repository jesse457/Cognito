<?php

declare(strict_types=1);

namespace App\Http\Controllers\Community;

use App\Enums\ForumStatus;
use App\Enums\PostStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Community\StorePostRequest;
use App\Http\Requests\Community\UpdatePostRequest;
use App\Http\Resources\Community\PostResource;
use App\Models\ForumPost;
use App\Models\ForumThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/**
 * Forum posts. Nesting is capped at one level: a reply may point at a
 * top-level post of the same thread, never at another reply.
 */
class PostController extends Controller
{
    /** Reply to a thread. Locked threads reject new posts with 422. */
    public function store(StorePostRequest $request, ForumThread $thread): JsonResponse
    {
        $this->ensureCanPost($thread);

        $parentPostId = $request->has('parent_post_id') && $request->input('parent_post_id') !== null
            ? $request->integer('parent_post_id')
            : null;

        if ($parentPostId !== null) {
            $this->ensureValidParent($parentPostId, $thread);
        }

        $post = ForumPost::query()->create([
            'thread_id' => $thread->getKey(),
            'user_id' => $request->user()->getKey(),
            'parent_post_id' => $parentPostId,
            'body' => $request->string('body')->trim()->value(),
            'status' => PostStatus::Visible,
        ]);

        $post->load('user');

        // A new reply is thread activity.
        $thread->touch();

        return (new PostResource($post))
            ->response()
            ->setStatusCode(201);
    }

    /** Author-only body edit. */
    public function update(UpdatePostRequest $request, ForumPost $post): PostResource
    {
        $post->update([
            'body' => $request->string('body')->trim()->value(),
        ]);

        $post->load('user');

        return new PostResource($post->refresh());
    }

    /**
     * Author-only hard delete. The `parent_post_id` FK is `nullOnDelete`, so
     * deleting a top-level post promotes its replies rather than dropping them.
     */
    public function destroy(Request $request, ForumPost $post): JsonResponse
    {
        Gate::forUser($request->user())->authorize('update', $post);

        $post->delete();

        return response()->json(['data' => null], 200);
    }

    private function ensureCanPost(ForumThread $thread): void
    {
        if ($thread->status === ForumStatus::Removed) {
            abort(404, 'Thread not found.');
        }

        if ($thread->isLocked()) {
            throw ValidationException::withMessages([
                'thread' => 'This thread is locked and does not accept new posts.',
            ]);
        }
    }

    /**
     * A parent must exist, belong to this thread, and be top-level. The
     * existing row is loaded explicitly rather than route-model-bound so a
     * missing parent is a validation problem (422), not a 404.
     */
    private function ensureValidParent(int $parentPostId, ForumThread $thread): void
    {
        $parent = ForumPost::query()->find($parentPostId);

        if ($parent === null) {
            throw ValidationException::withMessages([
                'parent_post_id' => 'The parent post does not exist.',
            ]);
        }

        if ($parent->thread_id !== $thread->getKey()) {
            throw ValidationException::withMessages([
                'parent_post_id' => 'The parent post belongs to a different thread.',
            ]);
        }

        if ($parent->parent_post_id !== null) {
            throw ValidationException::withMessages([
                'parent_post_id' => 'Replies may only nest one level deep.',
            ]);
        }

        if ($parent->status !== PostStatus::Visible) {
            throw ValidationException::withMessages([
                'parent_post_id' => 'The parent post is not available for replies.',
            ]);
        }
    }
}
