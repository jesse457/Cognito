<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

/**
 * Staff invitations.
 *
 *  - owner may invite admin or moderator
 *  - admin may invite moderator only
 *  - moderators and below may not invite anyone
 */
class StaffInvitationPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
    }

    public function create(User $actor, ?UserRole $role = null): bool
    {
        if (! $actor->roleAtLeast(UserRole::Admin)) {
            return false;
        }

        if ($role === null) {
            return true;
        }

        return in_array($role->value, $this->invitableRolesFor($actor), true);
    }

    public function revoke(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
    }

    /**
     * @return list<string>
     */
    public function invitableRolesFor(User $actor): array
    {
        return match ($actor->role) {
            UserRole::Owner => [UserRole::Admin->value, UserRole::Moderator->value],
            UserRole::Admin => [UserRole::Moderator->value],
            default => [],
        };
    }
}
