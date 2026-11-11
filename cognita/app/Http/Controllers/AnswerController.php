<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreAnswerRequest;
use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use App\Services\ClassroomAccess;
use App\Services\PostMediaStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
        ClassroomAccess $access,
        PostMediaStore $mediaStore,
    ): RedirectResponse {
        /** @var User $user */
        $user = $request->user();

        $access->assertQuestionAccess($user, $question);

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

    public function vote(Request $request, Answer $answer, ClassroomAccess $access): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $access->assertQuestionAccess($user, $answer->question);

        /** @var array{value: int} $data */
        $data = $request->validate([
            'value' => ['required', 'integer', Rule::in([-1, 0, 1])],
        ]);

        if ((int) $answer->user_id === (int) $user->getKey()) {
            throw ValidationException::withMessages([
                'vote' => 'You cannot vote on your own answer.',
            ]);
        }

        $value = (int) $data['value'];

        if ($value === 0) {
            $answer->votes()->where('user_id', $user->getKey())->delete();
        } else {
            $answer->votes()->updateOrCreate(
                ['user_id' => $user->getKey()],
                ['value' => $value],
            );
        }

        return response()->json([
            'data' => [
                'score' => (int) $answer->votes()->sum('value'),
                'vote' => $value,
            ],
        ]);
    }

    public function accept(Request $request, Answer $answer, ClassroomAccess $access): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $question = $answer->question;

        $access->assertQuestionAccess($user, $question);

        if ((int) $question->user_id !== (int) $user->getKey()) {
            abort(403, 'Only the person who asked can mark an accepted answer.');
        }

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
