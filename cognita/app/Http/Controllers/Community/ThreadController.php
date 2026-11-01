<?php

declare(strict_types=1);

namespace App\Http\Controllers\Community;

use App\Enums\ForumStatus;
use App\Enums\PostStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Community\StoreThreadRequest;
use App\Http\Requests\Community\UpdateThreadRequest;
use App\Http\Resources\Community\ThreadDetailResource;
use App\Http\Resources\Community\ThreadResource;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * Forum threads. Every route lives behind the `community` group, which exists
 * only while `features.social` is true; the policies re-check the flag anyway.
 */
class ThreadController extends Controller
{
    private const DEFAULT_PER_PAGE = 20;

    private const MAX_PER_PAGE = 100;

    /**
     * Visible threads, newest activity first. `?course_id=` narrows to one
     * course; staff may additionally pass `?include_removed=1`.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $viewer = $request->user();

        Gate::forUser($viewer)->authorize('viewAny', ForumThread::class);

        $perPage = $this->perPage($request);

        $query = ForumThread::query()
            ->with('user')
            ->withCount(['posts as visible_posts_count' => static function ($posts): void {
                $posts->where('status', PostStatus::Visible->value);
            }])
            ->orderByDesc('updated_at')
            ->orderByDesc('id');

        if (! ($this->isStaff($viewer) && $request->boolean('include_removed'))) {
            $query->visible();
        }

        $courseId = $request->integer('course_id');

        if ($courseId > 0) {
            $query->where('course_id', $courseId);
        }

        return ThreadResource::collection($query->paginate($perPage)->withQueryString());
    }

    /** Thread plus its visible (or, for staff, all) posts nested one level. */
    public function show(Request $request, ForumThread $thread): ThreadDetailResource
    {
        $viewer = $request->user();

        Gate::forUser($viewer)->authorize('view', $thread);

        // A removed thread is indistinguishable from a missing one for
        // non-staff, matching the list query's `visible()` filter.
        if (! $this->isStaff($viewer) && $thread->status === ForumStatus::Removed) {
            abort(404, 'Thread not found.');
        }

        $thread->load(['user']);

        // Non-staff never see hidden/removed posts; staff see every post so the
        // moderation context is complete.
        $isStaff = $this->isStaff($viewer);

        $thread->load(['posts' => static function ($posts) use ($isStaff): void {
            if (! $isStaff) {
                $posts->where('status', PostStatus::Visible->value);
            }

            $posts->orderBy('created_at');
        }, 'posts.user']);

        $thread->setAttribute('visible_posts_count', $thread->posts
            ->where('status', PostStatus::Visible)
            ->count());

        return new ThreadDetailResource($thread);
    }

    /** Start a thread in a course. */
    public function store(StoreThreadRequest $request): JsonResponse
    {
        $thread = ForumThread::query()->create([
            'course_id' => $request->integer('course_id'),
            'user_id' => $request->user()->getKey(),
            'title' => $request->string('title')->trim()->value(),
            'body' => $request->string('body')->trim()->value(),
            'status' => ForumStatus::Open,
        ]);

        $thread->setAttribute('visible_posts_count', 0);
        $thread->load('user');

        return (new ThreadResource($thread))
            ->response()
            ->setStatusCode(201);
    }

    /** Author-only edit of title and/or body. */
    public function update(UpdateThreadRequest $request, ForumThread $thread): ThreadResource
    {
        $attributes = array_filter(
            [
                'title' => $request->has('title') ? $request->string('title')->trim()->value() : null,
                'body' => $request->has('body') ? $request->string('body')->trim()->value() : null,
            ],
            static fn (?string $value): bool => $value !== null,
        );

        if ($attributes !== []) {
            $thread->update($attributes);
        }

        $thread->load('user');
        $thread->setAttribute('visible_posts_count', $thread->posts()
            ->where('status', PostStatus::Visible->value)
            ->count());

        return new ThreadResource($thread->refresh());
    }

    private function perPage(Request $request): int
    {
        $requested = $request->integer('per_page');

        if ($requested < 1) {
            return self::DEFAULT_PER_PAGE;
        }

        return min($requested, self::MAX_PER_PAGE);
    }

    /** Removed threads and hidden posts are staff-only visibility. */
    private function isStaff(?User $viewer): bool
    {
        return $viewer !== null && $viewer->isStaff();
    }
}
