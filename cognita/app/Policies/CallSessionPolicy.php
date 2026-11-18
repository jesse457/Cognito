<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\User;

/** Live session lifecycle; classroom ownership is the deciding rule. */
class CallSessionPolicy
{
    public function view(User $actor, CallSession $session): bool
    {
        return $this->owner($actor, (int) $session->classroom?->instructor_id)
            || $session->classroom?->enrollments()->where('student_id', $actor->getKey())->exists() === true;
    }

    public function schedule(User $actor, Classroom $classroom): bool
    {
        return $this->owner($actor, (int) $classroom->instructor_id);
    }

    public function start(User $actor, Classroom $classroom): bool
    {
        return $this->owner($actor, (int) $classroom->instructor_id);
    }

    public function end(User $actor, Classroom $classroom): bool
    {
        return $this->owner($actor, (int) $classroom->instructor_id);
    }

    public function restart(User $actor, Classroom $classroom): bool
    {
        return $this->owner($actor, (int) $classroom->instructor_id);
    }

    public function join(User $actor, Classroom $classroom): bool
    {
        return $this->owner($actor, (int) $classroom->instructor_id)
            || $classroom->hasPaidAccess($actor);
    }

    public function update(User $actor, CallSession $session): bool
    {
        return $this->owner($actor, (int) $session->classroom?->instructor_id);
    }

    public function delete(User $actor, CallSession $session): bool
    {
        return $this->owner($actor, (int) $session->classroom?->instructor_id);
    }

    private function owner(User $actor, int $instructorId): bool
    {
        return $instructorId !== 0 && $instructorId === (int) $actor->getKey();
    }
}
