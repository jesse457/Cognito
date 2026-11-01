<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * The single authorization boundary of the admin panel.
 *
 * Every rank-based decision lives here so that controllers and policies can
 * never drift apart. All failures abort with HTTP 403.
 *
 * Rank ladder (see App\Enums\UserRole::rank()):
 *   student 0 < instructor 1 < moderator 2 < admin 3 < owner 4
 */
final class AdminScopeService
{
    /**
     * Destructive account operations (ban / unban / delete / role change).
     *
     * Requiring admin rank for the *actor* means a moderator can never take an
     * account out of play, even against a student.
     */
    public function assertCanManageUser(User $actor, User $target): void
    {
        if ($actor->role->rank() < UserRole::Admin->rank()) {
            abort(403, 'You must be an administrator to manage user accounts.');
        }

        if ($actor->role->rank() <= $target->role->rank()) {
            abort(403, 'You cannot manage a user with an equal or higher role rank.');
        }
    }

    /**
     * Account-state operations (ban / unban / delete).
     *
     * Identical to assertCanManageUser with one documented exception: an owner
     * may act on a PEER owner. Owner is the sovereign top rank with full system
     * control, so "ban an owner" must be performable by an owner (Phase 12,
     * acceptance item 9); nothing above owner exists, so this cannot escalate
     * anyone's rank. Role changes remain strict — see assertCanChangeRole().
     */
    public function assertCanManageAccountState(User $actor, User $target): void
    {
        if ($actor->role->rank() < UserRole::Admin->rank()) {
            abort(403, 'You must be an administrator to manage user accounts.');
        }

        $actsOnPeerOwner = $actor->role === UserRole::Owner && $target->role === UserRole::Owner;

        if (! $actsOnPeerOwner && $actor->role->rank() <= $target->role->rank()) {
            abort(403, 'You cannot manage a user with an equal or higher role rank.');
        }
    }

    /**
     * Corrective account operations (warn / suspend).
     *
     * Moderators may act on students and instructors but never on peers or
     * anyone above them — mirroring UserPolicy::warn / UserPolicy::suspend.
     */
    public function assertCanModerateUser(User $actor, User $target): void
    {
        if ($actor->role->rank() < UserRole::Moderator->rank()) {
            abort(403, 'You must be a moderator to moderate users.');
        }

        if ($actor->role->rank() <= $target->role->rank()) {
            abort(403, 'You cannot moderate a user with an equal or higher role rank.');
        }
    }

    /**
     * A role change additionally requires that the actor can grant the role:
     * nobody promotes anyone above their own rank (no privilege escalation).
     */
    public function assertCanChangeRole(User $actor, User $target, UserRole $newRole): void
    {
        $this->assertCanManageUser($actor, $target);

        if ($newRole->rank() > $actor->role->rank()) {
            abort(403, 'You cannot grant a role with a higher rank than your own.');
        }
    }

    public function assertCanModerateReport(User $actor): void
    {
        if ($actor->role->rank() < UserRole::Moderator->rank()) {
            abort(403, 'You must be a moderator to action content reports.');
        }
    }

    public function assertCanAccessSettings(User $actor): void
    {
        if ($actor->role->rank() < UserRole::Owner->rank()) {
            abort(403, 'Only the owner can access system settings.');
        }
    }

    public function assertCanViewAuditLogs(User $actor): void
    {
        if ($actor->role->rank() < UserRole::Admin->rank()) {
            abort(403, 'You must be an administrator to read the audit trail.');
        }
    }

    public function assertCanModerateContent(User $actor): void
    {
        if ($actor->role->rank() < UserRole::Moderator->rank()) {
            abort(403, 'You must be a moderator to moderate content.');
        }
    }

    /**
     * Lookup helper used only AFTER an authorization check has passed.
     * Controllers must never call User::find() directly.
     */
    public function getUserOrFail(int $id): User
    {
        return User::query()->findOrFail($id);
    }

    /** Authorize first, then resolve the model (404 only for someone allowed to see it). */
    public function findUserForAdmin(User $actor, int $id): User
    {
        if ($actor->role->rank() < UserRole::Moderator->rank()) {
            abort(403, 'You must be a moderator to view users.');
        }

        return $this->getUserOrFail($id);
    }

    /**
     * The ONLY place the audit-trail visibility rule lives: owners see every
     * row, non-owner admins are forced to their own actions.
     *
     * @param  Builder<AdminAuditLog>  $query
     * @return Builder<AdminAuditLog>
     */
    public function scopeAuditLogsFor(User $actor, Builder $query): Builder
    {
        if ($actor->roleAtLeast(UserRole::Owner)) {
            return $query;
        }

        return $query->where('actor_id', $actor->getKey());
    }

    /** True when the actor outranks the target (pure check, never aborts). */
    public function outranks(User $actor, User $target): bool
    {
        return $actor->role->rank() > $target->role->rank();
    }
}
