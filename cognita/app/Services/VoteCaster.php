<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Apply one person's vote to a question or an answer.
 *
 * Both models have the same votes() relation, so the rule — you cannot vote on
 * your own post, zero clears your vote — lives here once instead of being copied
 * into each controller.
 */
final class VoteCaster
{
    /**
     * @return array{score: int, vote: int}
     *
     * @throws ValidationException when the voter owns the post
     */
    public function cast(Question|Answer $votable, User $user, int $value, string $noun): array
    {
        if ((int) $votable->user_id === (int) $user->getKey()) {
            throw ValidationException::withMessages([
                'vote' => 'You cannot vote on your own '.$noun.'.',
            ]);
        }

        if ($value === 0) {
            $votable->votes()->where('user_id', $user->getKey())->delete();
        } else {
            $votable->votes()->updateOrCreate(
                ['user_id' => $user->getKey()],
                ['value' => $value],
            );
        }

        return [
            'score' => (int) $votable->votes()->sum('value'),
            'vote' => $value,
        ];
    }
}
