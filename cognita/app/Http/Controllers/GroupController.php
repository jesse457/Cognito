<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreGroupRequest;
use App\Models\Group;
use App\Models\Question;
use App\Models\User;
use App\Support\HumanTime;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class GroupController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Group::class);

        /** @var User $user */
        $user = $request->user();

        return Inertia::render('Community/Groups', [
            'groups' => Group::query()
                ->with('creator:id,name')
                ->withCount(['members', 'questions'])
                ->withExists(['members as joined' => fn ($query) => $query->where('user_id', $user->getKey())])
                ->orderByDesc('created_at')
                ->get()
                ->map(static fn (Group $group): array => [
                    'id' => (int) $group->getKey(),
                    'name' => $group->name,
                    'description' => $group->description,
                    'creator' => $group->creator?->name ?? 'Former member',
                    'members_count' => (int) $group->members_count,
                    'posts_count' => (int) $group->questions_count,
                    'joined' => (bool) $group->joined,
                    'mine' => (int) $group->creator_id === (int) $user->getKey(),
                    'created_at' => HumanTime::ago($group->created_at),
                    'href' => route('community.groups.show', ['group' => $group->getKey()]),
                ])
                ->all(),
        ]);
    }

    public function show(Request $request, Group $group): Response
    {
        $this->authorize('view', $group);

        /** @var User $user */
        $user = $request->user();

        $group->load(['creator:id,name'])
            ->loadCount(['members', 'questions']);

        $posts = Question::query()
            ->where('group_id', $group->getKey())
            ->with(['user:id,name'])
            ->withCount(['answers', 'media'])
            ->withSum('votes', 'value')
            ->withExists(['answers as has_accepted_answer' => fn ($query) => $query->where('is_accepted', true)])
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString()
            ->through(static fn (Question $post): array => [
                'id' => (int) $post->getKey(),
                'title' => $post->title,
                'excerpt' => Str::limit(preg_replace('/\s+/', ' ', $post->body) ?? $post->body, 180),
                'tags' => $post->tags ?? [],
                'score' => (int) ($post->votes_sum_value ?? 0),
                'answers_count' => (int) $post->answers_count,
                'media_count' => (int) $post->media_count,
                'accepted' => (bool) $post->has_accepted_answer,
                'created_at' => HumanTime::ago($post->created_at),
                'user' => $post->user?->name ?? 'Former member',
                'href' => route('questions.show', ['question' => $post->getKey()]),
            ]);

        return Inertia::render('Community/Group', [
            'group' => [
                'id' => (int) $group->getKey(),
                'name' => $group->name,
                'description' => $group->description,
                'creator' => $group->creator?->name ?? 'Former member',
                'members_count' => (int) $group->members_count,
                'posts_count' => (int) $group->questions_count,
                'joined' => $group->hasMember($user),
                'mine' => (int) $group->creator_id === (int) $user->getKey(),
            ],
            'members' => $group->members()
                ->orderBy('name')
                ->limit(20)
                ->get(['users.id', 'users.name'])
                ->map(static fn (User $member): array => [
                    'id' => (int) $member->getKey(),
                    'name' => $member->name,
                ])
                ->all(),
            'posts' => $posts,
        ]);
    }

    public function store(StoreGroupRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('create', Group::class);

        /** @var array{name: string, description?: string|null} $data */
        $data = $request->validated();

        $group = Group::query()->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'creator_id' => $user->getKey(),
        ]);

        $group->members()->attach($user, ['joined_at' => now()]);

        return to_route('community.groups.show', ['group' => $group])
            ->with('success', 'Group created. You can post questions in it now.');
    }

    public function join(Request $request, Group $group): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('join', $group);

        $group->members()->syncWithoutDetaching([$user->getKey() => ['joined_at' => now()]]);

        return back()->with('success', 'You joined '.$group->name.'.');
    }

    public function leave(Request $request, Group $group): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('leave', $group);

        $group->members()->detach($user->getKey());

        return back()->with('success', 'You left '.$group->name.'.');
    }
}
