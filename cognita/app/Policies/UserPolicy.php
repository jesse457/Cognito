<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\User;

/** Account administration and the three surface gates. */
class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->hasPermission(Permission::ManageUsers);
    }

    public function view(User $actor, User $target): bool
    {
        return $actor->isAdmin() || $actor->is($target);
    }

    public function updateRole(User $actor, User $target): bool
    {
        return $actor->hasPermission(Permission::ManageUsers) && ! $actor->is($target);
    }

    public function delete(User $actor, User $target): bool
    {
        if (! $actor->hasPermission(Permission::ManageUsers) || $actor->is($target)) {
            return false;
        }

        return ! ($target->isAdmin() && User::query()->where('role', UserRole::Admin->value)->count() <= 1);
    }

    public function viewAdminConsole(User $actor): bool
    {
        return $actor->hasPermission(Permission::ViewAdminConsole);
    }

    public function viewInstructorDashboard(User $actor): bool
    {
        return $actor->isInstructor();
    }

    public function viewStudentDashboard(User $actor): bool
    {
        return $actor->isStudent();
    }
}
