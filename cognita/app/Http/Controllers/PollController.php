<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StorePollRequest;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\Poll;
use App\Models\PollResponse;
use App\Models\User;
use App\Services\BoardSessions;
use App\Support\HumanTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Live polls inside an open class session.
 *
 * The class owner creates a timed open-answer or multiple-choice poll; the
 * students in that call answer once and can change their answer until the timer
 * runs out. Results are aggregate and anonymous. A poll belongs to one call
 * session, so ending the lesson ends its polls as well.
 */
class PollController extends Controller
{
    public function __construct(
        private readonly BoardSessions $sessions,
    ) {}

    public function index(Request $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('viewPolls', $classroom);

        $session = $this->sessions->live($classroom);

        if ($session === null) {
            return response()->json(['data' => ['polls' => []]]);
        }

        $polls = Poll::query()
            ->where('classroom_id', $classroom->getKey())
            ->where('call_session_id', $session->getKey())
            ->with([
                // Choice polls only need counts; the viewer's own row is all the
                // state the page shows besides them.
                'options' => fn ($query) => $query->withCount('responses'),
                'responses' => fn ($query) => $query->where('user_id', $user->getKey()),
            ])
            ->withCount('responses')
            ->latest('id')
            ->limit(12)
            ->get();

        // Open-answer polls show every written answer; the rest never need the
        // response rows at all. This endpoint is polled every few seconds, so it
        // must not hydrate one model per student per poll.
        $writtenAnswers = $this->writtenAnswers($polls);

        $host = (int) $classroom->instructor_id === (int) $user->getKey();

        return response()->json([
            'data' => [
                'polls' => $polls
                    ->map(fn (Poll $poll): array => $this->payload(
                        $poll,
                        $user,
                        $host,
                        $writtenAnswers->get((int) $poll->getKey()),
                    ))
                    ->values()
                    ->all(),
            ],
        ]);
    }

    public function store(StorePollRequest $request, Classroom $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('createPoll', $classroom);

        $session = $this->sessions->live($classroom);

        if ($session === null) {
            throw ValidationException::withMessages([
                'poll' => 'Start the class before opening a poll.',
            ]);
        }

        /** @var array{kind: string, question: string, duration: int, options?: list<string>} $data */
        $data = $request->validated();

        $poll = DB::transaction(function () use ($classroom, $session, $user, $data): Poll {
            Poll::query()
                ->where('classroom_id', $classroom->getKey())
                ->where('call_session_id', $session->getKey())
                ->whereNull('closed_at')
                ->where('ends_at', '>', now())
                ->update(['closed_at' => now()]);

            $poll = Poll::query()->create([
                'classroom_id' => $classroom->getKey(),
                'call_session_id' => $session->getKey(),
                'created_by' => $user->getKey(),
                'kind' => $data['kind'],
                'question' => $data['question'],
                'ends_at' => now()->addSeconds((int) $data['duration']),
            ]);

            if ($poll->isChoice()) {
                foreach ($data['options'] ?? [] as $index => $label) {
                    $poll->options()->create([
                        'label' => $label,
                        'position' => $index,
                    ]);
                }
            }

            return $poll;
        });

        $poll->load(['options', 'responses']);

        return response()->json([
            'data' => $this->payload($poll, $user, true),
        ], 201);
    }

    public function respond(Request $request, Classroom $classroom, Poll $poll): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('respondToPoll', $classroom);
        $this->assertPollInSession($classroom, $poll);
        $this->authorize('respond', $poll);

        if (! $poll->isOpen()) {
            throw ValidationException::withMessages([
                'poll' => 'Voting has closed for this poll.',
            ]);
        }

        if ($poll->isChoice()) {
            /** @var array{option_id: int} $data */
            $data = $request->validate([
                'option_id' => ['required', 'integer'],
            ]);

            $option = $poll->options()->whereKey($data['option_id'])->first();

            if ($option === null) {
                throw ValidationException::withMessages([
                    'option_id' => 'Choose one of the options in this poll.',
                ]);
            }

            PollResponse::query()->updateOrCreate(
                [
                    'poll_id' => $poll->getKey(),
                    'user_id' => $user->getKey(),
                ],
                [
                    'poll_option_id' => $option->getKey(),
                    'body' => null,
                ],
            );
        } else {
            /** @var array{body: string} $data */
            $data = $request->validate([
                'body' => ['required', 'string', 'max:500'],
            ]);

            PollResponse::query()->updateOrCreate(
                [
                    'poll_id' => $poll->getKey(),
                    'user_id' => $user->getKey(),
                ],
                [
                    'poll_option_id' => null,
                    'body' => $data['body'],
                ],
            );
        }

        $poll->load(['options', 'responses']);

        return response()->json([
            'data' => $this->payload($poll, $user, false),
        ]);
    }

    public function close(Request $request, Classroom $classroom, Poll $poll): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('closePoll', $classroom);
        $this->assertPollInSession($classroom, $poll);
        $this->authorize('close', $poll);

        if ($poll->closed_at === null) {
            $poll->forceFill(['closed_at' => now()])->save();
        }

        $poll->load(['options', 'responses']);

        return response()->json([
            'data' => $this->payload($poll, $user, true),
        ]);
    }

    private function assertPollInSession(Classroom $classroom, Poll $poll): CallSession
    {
        $session = $this->sessions->live($classroom);

        abort_if($session === null, 404, 'No live class session.');
        abort_unless((int) $poll->classroom_id === (int) $classroom->getKey(), 404);
        abort_unless((int) $poll->call_session_id === (int) $session->getKey(), 404);

        return $session;
    }

    /**
     * The written answers of the open-answer polls, grouped by poll.
     *
     * @param  Collection<int, Poll>  $polls
     * @return Collection<int, Collection<int, PollResponse>>
     */
    private function writtenAnswers(Collection $polls): Collection
    {
        $ids = $polls
            ->reject(static fn (Poll $poll): bool => $poll->isChoice())
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        if ($ids === []) {
            return collect();
        }

        return PollResponse::query()
            ->whereIn('poll_id', $ids)
            ->whereNotNull('body')
            ->orderBy('id')
            ->get(['id', 'poll_id', 'user_id', 'body'])
            ->groupBy(static fn (PollResponse $response): int => (int) $response->poll_id);
    }

    /** @return array<string, mixed> */
    private function payload(Poll $poll, User $viewer, bool $host, ?Collection $answers = null): array
    {
        $myResponse = $poll->responses->firstWhere('user_id', (int) $viewer->getKey());
        $open = $poll->isOpen();
        $counts = $poll->options->mapWithKeys(static function ($option) use ($poll): array {
            $count = $option->getAttribute('responses_count');

            return [
                (int) $option->getKey() => (int) ($count
                    ?? $poll->responses->where('poll_option_id', $option->getKey())->count()),
            ];
        });

        return [
            'id' => (int) $poll->getKey(),
            'question' => $poll->question,
            'kind' => $poll->kind,
            'options' => $poll->isChoice()
                ? $poll->options
                    ->map(static fn ($option): array => [
                        'id' => (int) $option->getKey(),
                        'label' => $option->label,
                        'count' => (int) ($counts[$option->getKey()] ?? 0),
                    ])
                    ->values()
                    ->all()
                : [],
            'responses' => $poll->isChoice()
                ? []
                : ($answers ?? $poll->responses)
                    ->pluck('body')
                    ->filter(static fn ($body): bool => is_string($body) && trim($body) !== '')
                    ->values()
                    ->all(),
            'my_response' => $myResponse === null
                ? null
                : [
                    'option_id' => $myResponse->poll_option_id,
                    'body' => $myResponse->body,
                ],
            'total_responses' => (int) ($poll->responses_count ?? $poll->responses->count()),
            'is_open' => $open,
            'can_respond' => ! $host && $open,
            'can_close' => $host && $open,
            'ends_at' => $poll->ends_at->toIso8601String(),
            'closed_at' => $poll->closed_at?->toIso8601String(),
            'seconds_remaining' => $poll->secondsRemaining(),
            'created_at' => HumanTime::ago($poll->created_at),
        ];
    }
}
