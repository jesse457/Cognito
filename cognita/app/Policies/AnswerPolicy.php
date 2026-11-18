<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Answer;
use App\Models\Question;
use App\Models\User;

/** Answers inherit their question's audience. */
class AnswerPolicy
{
    public function view(User $actor, Answer $answer): bool
    {
        return $answer->question !== null && app(QuestionPolicy::class)->view($actor, $answer->question);
    }

    public function create(User $actor, Question $question): bool
    {
        return app(QuestionPolicy::class)->answer($actor, $question);
    }

    public function vote(User $actor, Answer $answer): bool
    {
        return $this->view($actor, $answer) && ! $actor->is($answer->user);
    }

    public function accept(User $actor, Answer $answer): bool
    {
        return $actor->is($answer->question?->user);
    }

    public function update(User $actor, Answer $answer): bool
    {
        return $actor->is($answer->user);
    }

    public function delete(User $actor, Answer $answer): bool
    {
        $question = $answer->question;

        return $actor->is($answer->user)
            || ($question !== null && app(QuestionPolicy::class)->delete($actor, $question));
    }
}
