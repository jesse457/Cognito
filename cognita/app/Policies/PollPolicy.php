<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Classroom;
use App\Models\Poll;
use App\Models\User;

/** Live polls follow the same access rules as the call they belong to. */
class PollPolicy
{
    public function view(User $actor, Poll $poll): bool
    {
        return $poll->classroom !== null && app(ClassroomPolicy::class)->viewPolls($actor, $poll->classroom);
    }

    public function create(User $actor, Classroom $classroom): bool
    {
        return app(ClassroomPolicy::class)->createPoll($actor, $classroom);
    }

    public function respond(User $actor, Poll $poll): bool
    {
        return $poll->classroom !== null && app(ClassroomPolicy::class)->respondToPoll($actor, $poll->classroom);
    }

    public function close(User $actor, Poll $poll): bool
    {
        return $poll->classroom !== null && app(ClassroomPolicy::class)->closePoll($actor, $poll->classroom);
    }

    public function update(User $actor, Poll $poll): bool
    {
        return $this->close($actor, $poll);
    }

    public function delete(User $actor, Poll $poll): bool
    {
        return $this->close($actor, $poll);
    }
}
