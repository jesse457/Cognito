<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreAnswerRequest;
use App\Http\Requests\VoteRequest;
use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use App\Services\PostMediaStore;
use App\Services\VoteCaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Answers hang off questions, so every action resolves the question first and
 * repeats the question access check (class membership or community) before
 * touching a row.
 */
class AnswerController extends Controller
{
    public function store(
        StoreAnswerRequest $request,
        Question $question,
        PostMediaStore $mediaStore,
    ): RedirectResponse {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('create', [Answer::class, $question]);

        /** @var array{body: string, media?: array<int, mixed>} $data */
        $data = $request->validated();

        $answer = $question->answers()->create([
            'user_id' => $user->getKey(),
            'body' => $data['body'],
        ]);

        $mediaStore->attach($answer, $data['media'] ?? [], $user);

        return to_route('questions.show', ['question' => $question->getKey()])
            ->with('success', 'Answer posted. Thanks for helping a classmate.');
    }

    public function vote(VoteRequest $request, Answer $answer, VoteCaster $votes): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('vote', $answer);

        /** @var array{value: int} $data */
        $data = $request->validated();

        return response()->json([
            'data' => $votes->cast($answer, $user, (int) $data['value'], 'answer'),
        ]);
    }

    public function accept(Request $request, Answer $answer): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $question = $answer->question;

        $this->authorize('accept', $answer);

        $acceptedAnswerId = DB::transaction(function () use ($answer, $question): ?int {
            $accepted = ! $answer->is_accepted;

            $question->answers()->update(['is_accepted' => false]);

            if ($accepted) {
                $answer->forceFill(['is_accepted' => true])->save();
            }

            return $accepted ? (int) $answer->getKey() : null;
        });

        return response()->json([
            'data' => [
                'accepted_answer_id' => $acceptedAnswerId,
            ],
        ]);
    }
}
