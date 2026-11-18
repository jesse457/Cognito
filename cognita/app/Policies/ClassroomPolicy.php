<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Classroom;
use App\Models\User;

/** Everything that happens inside one class. */
class ClassroomPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->isInstructor() || $actor->isStudent() || $actor->isAdmin();
    }

    public function view(User $actor, Classroom $classroom): bool
    {
        return $actor->isAdmin() || $this->owns($actor, $classroom) || $this->isMember($actor, $classroom);
    }

    public function create(User $actor): bool
    {
        return $actor->hasPermission(Permission::ManageClassrooms);
    }

    public function update(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function delete(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function rotateKey(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function manageRoster(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function viewCall(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom) || $this->isMember($actor, $classroom);
    }

    public function joinCall(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom)
            || ($this->isMember($actor, $classroom) && $classroom->hasPaidAccess($actor));
    }

    public function viewBoard(User $actor, Classroom $classroom): bool
    {
        return $this->joinCall($actor, $classroom);
    }

    public function manageBoard(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function viewMaterials(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom)
            || ($this->isMember($actor, $classroom) && $classroom->hasPaidAccess($actor));
    }

    public function manageMaterials(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function viewAttendance(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom) || $actor->isAdmin();
    }

    public function exportAttendance(User $actor, Classroom $classroom): bool
    {
        return $this->viewAttendance($actor, $classroom);
    }

    public function confirmPayments(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function reportPayment(User $actor, Classroom $classroom): bool
    {
        return $this->isMember($actor, $classroom);
    }

    public function scheduleSession(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function startSession(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function endSession(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function restartSession(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function moderateCall(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function manageDrawing(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function createPoll(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function viewPolls(User $actor, Classroom $classroom): bool
    {
        return $this->joinCall($actor, $classroom);
    }

    public function respondToPoll(User $actor, Classroom $classroom): bool
    {
        return ! $this->owns($actor, $classroom) && $this->joinCall($actor, $classroom);
    }

    public function closePoll(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    public function viewManagedClass(User $actor, Classroom $classroom): bool
    {
        return $this->owns($actor, $classroom);
    }

    private function owns(User $actor, Classroom $classroom): bool
    {
        return (int) $classroom->instructor_id === (int) $actor->getKey();
    }

    private function isMember(User $actor, Classroom $classroom): bool
    {
        return $classroom->enrollments()->where('student_id', $actor->getKey())->exists();
    }
}
