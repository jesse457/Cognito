<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

/**
 * Admin-panel user management policy.
 *
 * Rank rules, in one place:
 *  - moderator+ may view, warn and suspend.
 *  - admin+ may ban, unban, delete, change roles and impersonate.
 *  - nobody may act on a user of equal or higher rank than themselves.
 *  - nobody may grant a role above their own rank.
 */
class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator);
    }

    public function view(User $actor, User $target): bool
    {
        // Moderators see a redacted projection; that is enforced in the
        // controller/resource, not here.
        return $actor->roleAtLeast(UserRole::Moderator);
    }

    public function warn(User $actor, User $target): bool
    {
        return $this->canModerate($actor, $target);
    }

    public function suspend(User $actor, User $target): bool
    {
        return $this->canModerate($actor, $target);
    }

    public function ban(User $actor, User $target): bool
    {
        return $actor->roleAtLeast(UserRole::Admin) && $this->outranksOrPeerOwner($actor, $target);
    }

    public function unban(User $actor, User $target): bool
    {
        return $actor->roleAtLeast(UserRole::Admin) && $this->outranksOrPeerOwner($actor, $target);
    }

    public function delete(User $actor, User $target): bool
    {
        return $actor->roleAtLeast(UserRole::Admin) && $this->outranksOrPeerOwner($actor, $target);
    }

    public function changeRole(User $actor, User $target, ?UserRole $newRole = null): bool
    {
        if (! $actor->roleAtLeast(UserRole::Admin) || ! $this->outranks($actor, $target)) {
            return false;
        }

        if ($newRole === null) {
            return true;
        }

        return $newRole->rank() <= $actor->role->rank();
    }

    public function impersonate(User $actor, User $target): bool
    {
        // Admins may only impersonate users strictly below admin rank, and
        // never themselves.
        return $actor->roleAtLeast(UserRole::Admin)
            && ! $actor->is($target)
            && $target->role->rank() < UserRole::Admin->rank();
    }

    /** moderator+ against a strictly lower-ranked target. */
    private function canModerate(User $actor, User $target): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator) && $this->outranks($actor, $target);
    }

    private function outranks(User $actor, User $target): bool
    {
        return $actor->role->rank() > $target->role->rank();
    }

    /**
     * Account-state actions (ban/unban/delete) additionally allow an owner to
     * act on a peer owner — owner is the sovereign top rank (see
     * AdminScopeService::assertCanManageAccountState). Role changes stay strict.
     */
    private function outranksOrPeerOwner(User $actor, User $target): bool
    {
        return $this->outranks($actor, $target)
            || ($actor->role === UserRole::Owner && $target->role === UserRole::Owner);
    }
}
