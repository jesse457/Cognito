<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreQuestionRequest;
use App\Models\Answer;
use App\Models\Classroom;
use App\Models\PostMedia;
use App\Models\Question;
use App\Models\User;
use App\Services\ClassroomAccess;
use App\Services\PostMediaStore;
use App\Services\QuestionSearch;
use App\Support\HumanTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The question board: class-scoped threads for a room and community threads
 * open to every signed-in student and instructor. Class reads and writes go
 * through ClassroomAccess; community reads deliberately do not.
 */
class QuestionController extends Controller
{
    public function index(Request $request, ClassroomAccess $access, QuestionSearch $search): Response
    {
        /** @var User $user */
        $user = $request->user();

        $classrooms = $this->classroomsFor($user, $access);
        $classroomIds = $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();

        $scope = (string) $request->query('scope', 'class');

        if (! in_array($scope, ['class', 'community'], true)) {
            $scope = 'class';
        }

        $community = $scope === 'community';
        $classroomFilter = $request->integer('classroom') ?: null;

        if ($community) {
            abort_if($classroomFilter !== null, 404);
        } elseif ($classroomFilter !== null) {
            abort_unless(in_array($classroomFilter, $classroomIds, true), 404);
        }

        $sort = (string) $request->query('sort', 'newest');

        if (! in_array($sort, ['newest', 'top', 'unanswered'], true)) {
            $sort = 'newest';
        }

        $term = trim((string) $request->query('q', ''));

        $base = Question::query();

        if ($community) {
            $base->community();
        } else {
            $base->classroom()->whereIn('classroom_id', $classroomIds);
        }

        $searchMode = $term === '' ? 'none' : 'keyword';
        $searchResult = ['questions' => [], 'answers' => []];
        $semanticIds = [];

        $searchClassroomIds = $classroomFilter === null ? $classroomIds : [$classroomFilter];

        if ($term !== '') {
            $searchResult = $search->search($term, $community, $searchClassroomIds);
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

        $keywordIds = $term === ''
            ? []
            : (clone $base)
                ->when($classroomFilter !== null, fn ($query) => $query->where('classroom_id', $classroomFilter))
                ->where(function ($inner) use ($term): void {
                    $like = '%'.mb_strtolower($term).'%';

                    $inner->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(body) LIKE ?', [$like]);
                })
                ->pluck('id')
                ->map(static fn ($id): int => (int) $id)
                ->all();

        $listedIds = array_values(array_unique([...$semanticIds, ...$keywordIds]));

        $questionsQuery = (clone $base)
            ->with(['user:id,name', 'classroom:id,name'])
            ->withCount(['answers', 'media'])
            ->withSum('votes', 'value')
            ->withExists(['answers as has_accepted_answer' => fn ($query) => $query->where('is_accepted', true)])
            ->with(['votes' => fn ($query) => $query->where('user_id', $user->getKey())])
            ->when($classroomFilter !== null, fn ($query) => $query->where('classroom_id', $classroomFilter))
            ->when($sort === 'unanswered', fn ($query) => $query->whereDoesntHave('answers'));

        if ($semanticIds !== []) {
            $questionsQuery
                ->whereIn('id', $listedIds)
                ->orderByRaw($this->rankSql($listedIds), $listedIds);
        } else {
            if ($term !== '') {
                $like = '%'.mb_strtolower($term).'%';

                $questionsQuery->where(function ($inner) use ($like): void {
                    $inner->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(body) LIKE ?', [$like]);
                });
            }

            if ($sort === 'top') {
                $questionsQuery->orderByRaw('votes_sum_value desc nulls last')->orderByDesc('created_at');
            } else {
                $questionsQuery->orderByDesc('created_at');
            }
        }

        $questions = $questionsQuery
            ->paginate(10)
            ->withQueryString()
            ->through(function (Question $question) use ($user, $searchMatches): array {
                $excerpt = preg_replace('/\s+/', ' ', $question->body) ?? $question->body;
                $match = $searchMatches[(int) $question->getKey()] ?? null;

                return [
                    'id' => (int) $question->getKey(),
                    'title' => $question->title,
                    'excerpt' => Str::limit($excerpt, 180),
                    'tags' => $question->tags ?? [],
                    'visibility' => $question->visibility,
                    'score' => (int) ($question->votes_sum_value ?? 0),
                    'answers_count' => (int) $question->answers_count,
                    'media_count' => (int) $question->media_count,
                    'accepted' => (bool) $question->has_accepted_answer,
                    'my_vote' => (int) ($question->votes->first()?->value ?? 0),
                    'can_vote' => (int) $question->user_id !== (int) $user->getKey(),
                    'mine' => (int) $question->user_id === (int) $user->getKey(),
                    'created_at' => HumanTime::ago($question->created_at),
                    'match_kind' => $match['kind'] ?? null,
                    'match_excerpt' => $match['excerpt'] ?? null,
                    'match_answer_id' => ($match['answer'] ?? null)?->getKey(),
                    'user' => [
                        'id' => (int) $question->user_id,
                        'name' => $question->user?->name ?? 'Former student',
                    ],
                    'classroom' => $question->classroom === null
                        ? null
                        : [
                            'id' => (int) $question->classroom_id,
                            'name' => $question->classroom->name,
                        ],
                    'href' => route('questions.show', ['question' => $question->getKey()]),
                ];
            });

        return Inertia::render('Questions/Index', [
            'filters' => [
                'q' => $term,
                'classroom' => $classroomFilter,
                'sort' => $sort,
                'scope' => $scope,
            ],
            'stats' => [
                'questions' => (clone $base)->count(),
                'answers' => Answer::query()
                    ->whereHas('question', function ($query) use ($community, $classroomIds): void {
                        if ($community) {
                            $query->community();
                        } else {
                            $query->classroom()->whereIn('classroom_id', $classroomIds);
                        }
                    })
                    ->count(),
                'solved' => (clone $base)
                    ->whereHas('answers', fn ($query) => $query->where('is_accepted', true))
                    ->count(),
                'unanswered' => (clone $base)->whereDoesntHave('answers')->count(),
                'unaccepted' => (clone $base)
                    ->whereHas('answers')
                    ->whereDoesntHave('answers', fn ($query) => $query->where('is_accepted', true))
                    ->count(),
                'mine' => (clone $base)->where('user_id', $user->getKey())->count(),
            ],
            'classrooms' => $classrooms
                ->map(static fn (Classroom $classroom): array => [
                    'id' => (int) $classroom->getKey(),
                    'name' => $classroom->name,
                    'course' => $classroom->course?->title,
                ])
                ->values()
                ->all(),
            'questions' => $questions,
            'search' => [
                'mode' => $searchMode,
                'term' => $term,
                'total' => count($listedIds),
                'answers' => array_map(
                    static fn (array $match): array => [
                        'question_id' => (int) $match['question']->getKey(),
                        'question_title' => $match['question']->title,
                        'answer_id' => (int) $match['answer']->getKey(),
                        'excerpt' => $match['excerpt'],
                        'href' => route('questions.show', ['question' => $match['question']->getKey()])
                            .'#answer-'.$match['answer']->getKey(),
                    ],
                    $searchResult['answers'],
                ),
            ],
            'canAsk' => $community || $classroomIds !== [],
        ]);
    }

    public function show(Request $request, Question $question, ClassroomAccess $access, QuestionSearch $search): Response
    {
        /** @var User $user */
        $user = $request->user();

        $access->assertQuestionAccess($user, $question);

        $question->load([
            'user:id,name',
            'classroom:id,name,course_id',
            'classroom.course:id,title',
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
                    'name' => $answer->user?->name ?? 'Former student',
                ],
            ]);

        $acceptedAnswer = $answers->firstWhere('accepted', true);

        $relatedMatches = $search->related($question, 5);

        $relatedQuestions = collect($relatedMatches)->pluck('question');

        if ($relatedQuestions->isEmpty()) {
            $relatedQuestions = Question::query()
                ->when(
                    $question->isCommunity(),
                    fn ($query) => $query->community(),
                    fn ($query) => $query->classroom()->where('classroom_id', $question->classroom_id),
                )
                ->whereKeyNot($question->getKey())
                ->latest()
                ->limit(5)
                ->get();
        }

        $relatedQuestions->each(function (Question $item): void {
            $item->loadCount('answers')->loadSum('votes', 'value');
        });

        $related = $relatedQuestions
            ->map(static fn (Question $item): array => [
                'id' => (int) $item->getKey(),
                'title' => $item->title,
                'score' => (int) ($item->votes_sum_value ?? 0),
                'answers_count' => (int) $item->answers_count,
                'href' => route('questions.show', ['question' => $item->getKey()]),
            ])
            ->values()
            ->all();

        return Inertia::render('Questions/Show', [
            'question' => [
                'id' => (int) $question->getKey(),
                'title' => $question->title,
                'body' => $question->body,
                'tags' => $question->tags ?? [],
                'visibility' => $question->visibility,
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
                    'name' => $question->user?->name ?? 'Former student',
                ],
                'classroom' => $question->classroom === null
                    ? null
                    : [
                        'id' => (int) $question->classroom_id,
                        'name' => $question->classroom->name,
                        'course' => $question->classroom->course?->title,
                    ],
                'href' => route('questions.show', ['question' => $question->getKey()]),
            ],
            'answers' => $answers,
            'acceptedAnswerId' => $acceptedAnswer['id'] ?? null,
            'related' => $related,
            'canAnswer' => true,
        ]);
    }

    public function store(
        StoreQuestionRequest $request,
        ClassroomAccess $access,
        PostMediaStore $mediaStore,
    ): RedirectResponse {
        /** @var User $user */
        $user = $request->user();

        /** @var array{scope: string, classroom_id?: int|null, title: string, body: string, tags?: list<string>, media?: array<int, mixed>} $data */
        $data = $request->validated();

        $attributes = [
            'user_id' => $user->getKey(),
            'title' => $data['title'],
            'body' => $data['body'],
            'tags' => $data['tags'] ?? [],
        ];

        if ($data['scope'] === 'community') {
            $question = Question::query()->create([
                ...$attributes,
                'classroom_id' => null,
                'visibility' => Question::VISIBILITY_COMMUNITY,
            ]);
        } else {
            $classroom = Classroom::query()->findOrFail($data['classroom_id']);
            $access->assertParticipant($user, $classroom);

            $question = Question::query()->create([
                ...$attributes,
                'classroom_id' => $classroom->getKey(),
                'visibility' => Question::VISIBILITY_CLASSROOM,
            ]);
        }

        $mediaStore->attach($question, $data['media'] ?? [], $user);

        return to_route('questions.show', ['question' => $question])
            ->with(
                'success',
                $data['scope'] === 'community'
                    ? 'Question posted to the community. Anyone signed in can answer and vote.'
                    : 'Question posted. Your class can answer and vote now.',
            );
    }

    public function vote(Request $request, Question $question, ClassroomAccess $access): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $access->assertQuestionAccess($user, $question);

        /** @var array{value: int} $data */
        $data = $request->validate([
            'value' => ['required', 'integer', Rule::in([-1, 0, 1])],
        ]);

        if ((int) $question->user_id === (int) $user->getKey()) {
            throw ValidationException::withMessages([
                'vote' => 'You cannot vote on your own question.',
            ]);
        }

        $value = (int) $data['value'];

        if ($value === 0) {
            $question->votes()->where('user_id', $user->getKey())->delete();
        } else {
            $question->votes()->updateOrCreate(
                ['user_id' => $user->getKey()],
                ['value' => $value],
            );
        }

        return response()->json([
            'data' => [
                'score' => (int) $question->votes()->sum('value'),
                'vote' => $value,
            ],
        ]);
    }

    /**
     * Keep semantic hits in the order pgvector returned them.
     *
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
     * @return list<array{id: int, url: string, name: string, mime: string, size: int}>
     */
    private function mediaPayload(Question|Answer $owner): array
    {
        return $owner->media
            ->map(static fn (PostMedia $media): array => $media->reference())
            ->values()
            ->all();
    }

    /** @return Collection<int, Classroom> */
    private function classroomsFor(User $user, ClassroomAccess $access): Collection
    {
        return $user->isInstructor()
            ? $access->forInstructor($user)
            : $access->forStudent($user);
    }
}
