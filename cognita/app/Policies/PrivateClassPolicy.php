<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\PrivateClass;
use App\Models\User;

class PrivateClassPolicy
{
    public function viewAny(User $actor): bool
    {
        if ($actor->roleAtLeast(UserRole::Admin)) {
            return true;
        }

        return (bool) config('features.instructor_path') && $actor->isInstructor();
    }

    public function view(User $actor, PrivateClass $class): bool
    {
        return $this->ownsOrIsAdmin($actor, $class);
    }

    public function update(User $actor, PrivateClass $class): bool
    {
        return $this->ownsOrIsAdmin($actor, $class);
    }

    public function delete(User $actor, PrivateClass $class): bool
    {
        return $this->ownsOrIsAdmin($actor, $class);
    }

    /** Instructors may create classes only when the optional portal is enabled. */
    public function create(User $actor): bool
    {
        if ($actor->roleAtLeast(UserRole::Admin)) {
            return true;
        }

        return (bool) config('features.instructor_path') && $actor->isInstructor();
    }

    private function ownsOrIsAdmin(User $actor, PrivateClass $class): bool
    {
        if ($actor->roleAtLeast(UserRole::Admin)) {
            return true;
        }

        if (! config('features.instructor_path')) {
            return false;
        }

        return $actor->isInstructor() && $class->instructor_id === $actor->getKey();
    }
}
