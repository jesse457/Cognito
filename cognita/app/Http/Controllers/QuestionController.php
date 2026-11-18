<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreQuestionRequest;
use App\Http\Requests\VoteRequest;
use App\Models\Answer;
use App\Models\Group;
use App\Models\PostMedia;
use App\Models\Question;
use App\Models\User;
use App\Services\PostMediaStore;
use App\Services\QuestionSearch;
use App\Services\VoteCaster;
use App\Support\HumanTime;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The community feed: general posts for everyone, and questions inside the
 * learner-made groups. Answers and votes work the same way in both.
 */
class QuestionController extends Controller
{
    public function index(Request $request, QuestionSearch $search): Response
    {
        $this->authorize('viewAny', Question::class);

        /** @var User $user */
        $user = $request->user();

        $scope = (string) $request->query('scope', 'all');

        if (! in_array($scope, ['all', 'general', 'group', 'mine'], true)) {
            $scope = 'all';
        }

        $groupId = $request->integer('group') ?: null;

        if ($scope === 'group') {
            abort_if($groupId === null, 404);
            abort_unless(Group::query()->whereKey($groupId)->exists(), 404);
        }

        $sort = (string) $request->query('sort', 'newest');

        if (! in_array($sort, ['newest', 'top', 'unanswered'], true)) {
            $sort = 'newest';
        }

        $term = trim((string) $request->query('q', ''));
        $myGroupIds = $user->joinedGroups()->pluck('groups.id')->map(static fn ($id): int => (int) $id)->all();

        $base = Question::query();

        switch ($scope) {
            case 'general':
                $base->whereNull('group_id');
                break;
            case 'group':
                $base->where('group_id', $groupId);
                break;
            case 'mine':
                $base->where(static function ($query) use ($myGroupIds): void {
                    $query->whereNull('group_id')->orWhereIn('group_id', $myGroupIds);
                });
                break;
        }

        $searchMode = $term === '' ? 'none' : 'keyword';
        $searchResult = ['questions' => [], 'answers' => []];
        $semanticIds = [];

        if ($term !== '') {
            $searchResult = $search->search($term, $scope === 'group' ? $groupId : null);
            $semanticIds = array_map(
                static fn (array $match): int => (int) $match['question']->getKey(),
                $searchResult['questions'],
            );

            if ($semanticIds !== []) {
                $searchMode = 'semantic';
            }
        }

        $searchMatches = [];

        foreach ($searchResult['questions'] as $match) {
            $searchMatches[(int) $match['question']->getKey()] = $match;
        }

        // Keyword ids are only needed to merge with semantic matches. Without
        // semantic matches the feed applies the LIKE filter itself, so a second
        // scan of the same rows would be wasted.
        $keywordIds = $term === '' || $semanticIds === []
            ? []
            : (clone $base)
                ->where(function ($inner) use ($term): void {
                    $like = '%'.mb_strtolower($term).'%';

                    $inner->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(body) LIKE ?', [$like]);
                })
                ->pluck('id')
                ->map(static fn ($id): int => (int) $id)
                ->all();

        $listedIds = array_values(array_unique([...$semanticIds, ...$keywordIds]));

        $postsQuery = (clone $base)
            ->with(['user:id,name', 'group:id,name', 'media'])
            ->withCount(['answers', 'media'])
            ->withSum('votes', 'value')
            ->withExists(['answers as has_accepted_answer' => fn ($query) => $query->where('is_accepted', true)])
            ->with(['votes' => fn ($query) => $query->where('user_id', $user->getKey())])
            ->when($sort === 'unanswered', fn ($query) => $query->whereDoesntHave('answers'));

        if ($semanticIds !== []) {
            $postsQuery
                ->whereIn('id', $listedIds)
                ->orderByRaw($this->rankSql($listedIds), $listedIds);
        } else {
            if ($term !== '') {
                $like = '%'.mb_strtolower($term).'%';

                $postsQuery->where(function ($inner) use ($like): void {
                    $inner->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(body) LIKE ?', [$like]);
                });
            }

            if ($sort === 'top') {
                $postsQuery->orderByRaw('votes_sum_value desc nulls last')->orderByDesc('created_at')->orderByDesc('id');
            } else {
                $postsQuery->orderByDesc('created_at')->orderByDesc('id');
            }
        }

        $posts = $postsQuery
            ->paginate(10)
            ->withQueryString()
            ->through(function (Question $post) use ($user, $searchMatches): array {
                $excerpt = preg_replace('/\s+/', ' ', $post->body) ?? $post->body;
                $match = $searchMatches[(int) $post->getKey()] ?? null;

                return [
                    'id' => (int) $post->getKey(),
                    'title' => $post->title,
                    'excerpt' => Str::limit($excerpt, 180),
                    'tags' => $post->tags ?? [],
                    'score' => (int) ($post->votes_sum_value ?? 0),
                    'answers_count' => (int) $post->answers_count,
                    'media_count' => (int) $post->media_count,
                    'media' => $this->mediaPayload($post),
                    'accepted' => (bool) $post->has_accepted_answer,
                    'my_vote' => (int) ($post->votes->first()?->value ?? 0),
                    'can_vote' => (int) $post->user_id !== (int) $user->getKey(),
                    'mine' => (int) $post->user_id === (int) $user->getKey(),
                    'created_at' => HumanTime::ago($post->created_at),
                    'match_kind' => $match['kind'] ?? null,
                    'match_excerpt' => $match['excerpt'] ?? null,
                    'match_answer_id' => ($match['answer'] ?? null)?->getKey(),
                    'user' => [
                        'id' => (int) $post->user_id,
                        'name' => $post->user?->name ?? 'Former member',
                    ],
                    'group' => $post->group === null ? null : [
                        'id' => (int) $post->group_id,
                        'name' => $post->group->name,
                    ],
                    'href' => route('questions.show', ['question' => $post->getKey()]),
                ];
            });

        return Inertia::render('Community/Feed', [
            'filters' => [
                'q' => $term,
                'scope' => $scope,
                'group' => $groupId,
                'sort' => $sort,
            ],
            'stats' => [
                'posts' => (clone $base)->count(),
                'answers' => Answer::query()->whereHas('question', $this->scopeClosure($scope, $groupId, $myGroupIds))->count(),
                'solved' => (clone $base)->whereHas('answers', fn ($query) => $query->where('is_accepted', true))->count(),
                'unanswered' => (clone $base)->whereDoesntHave('answers')->count(),
                'mine' => (clone $base)->where('user_id', $user->getKey())->count(),
            ],
            'groups' => Group::query()
                ->withCount(['members', 'questions'])
                ->withExists(['members as joined' => fn ($query) => $query->where('user_id', $user->getKey())])
                ->orderBy('name')
                ->get()
                ->map(static fn (Group $group): array => [
                    'id' => (int) $group->getKey(),
                    'name' => $group->name,
                    'description' => $group->description,
                    'members_count' => (int) $group->members_count,
                    'posts_count' => (int) $group->questions_count,
                    'joined' => (bool) $group->joined,
                    'href' => route('community.groups.show', ['group' => $group->getKey()]),
                ])
                ->all(),
            'posts' => $posts,
            'search' => [
                'mode' => $searchMode,
                'term' => $term,
                'total' => $posts->total(),
                'answers' => array_map(
                    static fn (array $match): array => [
                        'post_id' => (int) $match['question']->getKey(),
                        'post_title' => $match['question']->title,
                        'answer_id' => (int) $match['answer']->getKey(),
                        'excerpt' => $match['excerpt'],
                        'href' => route('questions.show', ['question' => $match['question']->getKey()])
                            .'#answer-'.$match['answer']->getKey(),
                    ],
                    $searchResult['answers'],
                ),
            ],
        ]);
    }

    public function show(Request $request, Question $question, QuestionSearch $search): Response
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('view', $question);

        $question->load([
            'user:id,name',
            'group:id,name,description,creator_id',
            'media',
            'votes' => fn ($query) => $query->where('user_id', $user->getKey()),
        ])->loadCount('answers')->loadSum('votes', 'value');

        $isAuthor = (int) $question->user_id === (int) $user->getKey();

        $answers = $question->answers()
            ->with(['user:id,name', 'media', 'votes' => fn ($query) => $query->where('user_id', $user->getKey())])
            ->withSum('votes', 'value')
            ->orderByDesc('is_accepted')
            ->orderByRaw('votes_sum_value desc nulls last')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Answer $answer): array => [
                'id' => (int) $answer->getKey(),
                'body' => $answer->body,
                'score' => (int) ($answer->votes_sum_value ?? 0),
                'my_vote' => (int) ($answer->votes->first()?->value ?? 0),
                'accepted' => $answer->is_accepted,
                'mine' => (int) $answer->user_id === (int) $user->getKey(),
                'can_vote' => (int) $answer->user_id !== (int) $user->getKey(),
                'can_accept' => $isAuthor,
                'media' => $this->mediaPayload($answer),
                'created_at' => HumanTime::ago($answer->created_at),
                'user' => [
                    'id' => (int) $answer->user_id,
                    'name' => $answer->user?->name ?? 'Former member',
                ],
            ]);

        $acceptedAnswer = $answers->firstWhere('accepted', true);

        $relatedMatches = $search->related($question, 5);
        $relatedQuestions = collect($relatedMatches)->pluck('question');

        if ($relatedQuestions->isEmpty()) {
            $relatedQuestions = Question::query()
                ->when(
                    $question->group_id === null,
                    fn ($query) => $query->whereNull('group_id'),
                    fn ($query) => $query->where('group_id', $question->group_id),
                )
                ->whereKeyNot($question->getKey())
                ->latest()
                ->limit(5)
                ->get();
        }

        $relatedQuestions = EloquentCollection::make($relatedQuestions->all())
            ->loadCount('answers')
            ->loadSum('votes', 'value');

        return Inertia::render('Community/Post', [
            'question' => [
                'id' => (int) $question->getKey(),
                'title' => $question->title,
                'body' => $question->body,
                'tags' => $question->tags ?? [],
                'score' => (int) ($question->votes_sum_value ?? 0),
                'answers_count' => (int) $question->answers_count,
                'accepted' => $acceptedAnswer !== null,
                'my_vote' => (int) ($question->votes->first()?->value ?? 0),
                'can_vote' => (int) $question->user_id !== (int) $user->getKey(),
                'can_accept' => $isAuthor,
                'mine' => $isAuthor,
                'media' => $this->mediaPayload($question),
                'created_at' => HumanTime::ago($question->created_at),
                'user' => [
                    'id' => (int) $question->user_id,
                    'name' => $question->user?->name ?? 'Former member',
                ],
                'group' => $question->group === null ? null : [
                    'id' => (int) $question->group_id,
                    'name' => $question->group->name,
                    'href' => route('community.groups.show', ['group' => $question->group->getKey()]),
                ],
                'href' => route('questions.show', ['question' => $question->getKey()]),
            ],
            'answers' => $answers,
            'acceptedAnswerId' => $acceptedAnswer['id'] ?? null,
            'related' => $relatedQuestions
                ->map(static fn (Question $item): array => [
                    'id' => (int) $item->getKey(),
                    'title' => $item->title,
                    'score' => (int) ($item->votes_sum_value ?? 0),
                    'answers_count' => (int) $item->answers_count,
                    'href' => route('questions.show', ['question' => $item->getKey()]),
                ])
                ->values()
                ->all(),
        ]);
    }

    public function store(StoreQuestionRequest $request, PostMediaStore $mediaStore): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var array{group_id?: int|null, title: string, body: string, tags?: list<string>, media?: array<int, mixed>} $data */
        $data = $request->validated();

        $groupId = $data['group_id'] ?? null;
        $group = $groupId === null || $groupId === 0
            ? null
            : Group::query()->findOrFail($groupId);

        if ($group === null) {
            $this->authorize('create', Question::class);
        } else {
            $this->authorize('createInGroup', [Question::class, $group]);
        }

        $post = Question::query()->create([
            'user_id' => $user->getKey(),
            'group_id' => $group?->getKey(),
            'title' => $data['title'],
            'body' => $data['body'],
            'tags' => $data['tags'] ?? [],
        ]);

        $mediaStore->attach($post, $data['media'] ?? [], $user);

        return to_route('questions.show', ['question' => $post])
            ->with('success', $group === null
                ? 'Posted to the community. Everyone signed in can answer and vote.'
                : 'Question posted to '.$group->name.'. Members can answer and vote now.');
    }

    public function vote(VoteRequest $request, Question $question, VoteCaster $votes): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('vote', $question);

        /** @var array{value: int} $data */
        $data = $request->validated();

        return response()->json([
            'data' => $votes->cast($question, $user, (int) $data['value'], 'question'),
        ]);
    }

    /**
     * @param  list<int>  $ids
     */
    private function rankSql(array $ids): string
    {
        $cases = [];

        foreach ($ids as $index => $id) {
            $cases[] = 'WHEN ? THEN '.$index;
        }

        return 'CASE id '.implode(' ', $cases).' ELSE '.count($ids).' END';
    }

    /**
     * @param  list<int>  $myGroupIds
     * @return callable(Builder): void
     */
    private function scopeClosure(string $scope, ?int $groupId, array $myGroupIds): callable
    {
        return static function ($query) use ($scope, $groupId, $myGroupIds): void {
            match ($scope) {
                'general' => $query->whereNull('group_id'),
                'group' => $query->where('group_id', $groupId),
                'mine' => $query->where(static function ($inner) use ($myGroupIds): void {
                    $inner->whereNull('group_id')->orWhereIn('group_id', $myGroupIds);
                }),
                default => null,
            };
        };
    }

    /**
     * @return list<array{id: int, url: string, name: string, mime: string, size: int}>
     */
    private function mediaPayload(Question|Answer $owner): array
    {
        return $owner->media
            ->map(static fn (PostMedia $media): array => $media->reference())
            ->values()
            ->all();
    }
}
