<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Group;
use App\Models\Question;
use App\Models\User;

/** Who may read, write, answer and vote on community posts. */
class QuestionPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->isStudent() || $actor->isInstructor();
    }

    public function view(User $actor, Question $question): bool
    {
        return $this->viewAny($actor);
    }

    public function create(User $actor): bool
    {
        return $this->viewAny($actor);
    }

    public function createInGroup(User $actor, Group $group): bool
    {
        return $this->viewAny($actor) && $group->hasMember($actor);
    }

    public function vote(User $actor, Question $question): bool
    {
        return $this->view($actor, $question) && ! $actor->is($question->user);
    }

    public function answer(User $actor, Question $question): bool
    {
        return $this->view($actor, $question);
    }

    public function update(User $actor, Question $question): bool
    {
        return $actor->is($question->user);
    }

    public function delete(User $actor, Question $question): bool
    {
        return $actor->is($question->user)
            || ($question->group !== null && (int) $question->group->creator_id === (int) $actor->getKey());
    }
}
