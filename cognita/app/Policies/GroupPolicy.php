<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Group;
use App\Models\User;

/** Any learner can start or join a group; only its creator manages it. */
class GroupPolicy
{
    public function viewAny(User $actor): bool
    {
        return true;
    }

    public function view(User $actor, Group $group): bool
    {
        return true;
    }

    public function create(User $actor): bool
    {
        return $actor->isStudent() || $actor->isInstructor();
    }

    public function join(User $actor, Group $group): bool
    {
        return ($actor->isStudent() || $actor->isInstructor()) && ! $group->hasMember($actor);
    }

    public function leave(User $actor, Group $group): bool
    {
        return $group->hasMember($actor) && (int) $group->creator_id !== (int) $actor->getKey();
    }

    public function post(User $actor, Group $group): bool
    {
        return ($actor->isStudent() || $actor->isInstructor()) && $group->hasMember($actor);
    }

    public function update(User $actor, Group $group): bool
    {
        return (int) $group->creator_id === (int) $actor->getKey();
    }

    public function delete(User $actor, Group $group): bool
    {
        return $this->update($actor, $group);
    }
}
