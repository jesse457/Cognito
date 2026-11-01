<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReasonRequest;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use App\Services\ModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin forum moderation. Thread/post *content* lives in the community surface,
 * but moderation is always available because the admin panel is always mounted.
 */
final class ForumModerationController extends Controller
{
    public function __construct(private readonly ModerationService $moderation) {}

    public function lockThread(Request $request, int $thread): JsonResponse
    {
        $actor = $this->actor($request);
        $model = ForumThread::query()->findOrFail($thread);

        $locked = $this->moderation->lockThread($actor, $model);

        return response()->json(['data' => $this->describeThread($locked)]);
    }

    public function removeThread(ReasonRequest $request, int $thread): JsonResponse
    {
        $actor = $this->actor($request);
        $model = ForumThread::query()->findOrFail($thread);

        $removed = $this->moderation->removeThread($actor, $model, $request->reason());

        return response()->json(['data' => $this->describeThread($removed)]);
    }

    public function hidePost(ReasonRequest $request, int $post): JsonResponse
    {
        $actor = $this->actor($request);
        $model = ForumPost::query()->findOrFail($post);

        $hidden = $this->moderation->hidePost($actor, $model, $request->reason());

        return response()->json(['data' => $this->describePost($hidden)]);
    }

    public function removePost(ReasonRequest $request, int $post): JsonResponse
    {
        $actor = $this->actor($request);
        $model = ForumPost::query()->findOrFail($post);

        $removed = $this->moderation->removePost($actor, $model, $request->reason());

        return response()->json(['data' => $this->describePost($removed)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function describeThread(ForumThread $thread): array
    {
        return [
            'id' => $thread->getKey(),
            'title' => $thread->title,
            'status' => $thread->status->value,
            'status_label' => $thread->status->label(),
            'course_id' => $thread->course_id,
            'user_id' => $thread->user_id,
            'removed_by' => $thread->removed_by,
            'removal_reason' => $thread->removal_reason,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function describePost(ForumPost $post): array
    {
        return [
            'id' => $post->getKey(),
            'thread_id' => $post->thread_id,
            'status' => $post->status->value,
            'status_label' => $post->status->label(),
            'user_id' => $post->user_id,
            'hidden_by' => $post->hidden_by,
        ];
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401, 'Unauthenticated.');

        return $user;
    }
}
