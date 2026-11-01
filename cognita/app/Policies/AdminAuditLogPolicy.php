<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\AdminAuditLog;
use App\Models\User;

/**
 * The audit trail is readable by admins and owners only. Owners see every row;
 * admins see only their own actions (the row-level filter lives in
 * AdminScopeService::scopeAuditLogsFor, so no controller can bypass it).
 */
class AdminAuditLogPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
    }

    public function view(User $actor, AdminAuditLog $log): bool
    {
        if ($actor->roleAtLeast(UserRole::Owner)) {
            return true;
        }

        return $actor->roleAtLeast(UserRole::Admin) && $log->actor_id === $actor->getKey();
    }

    /** Audit rows are immutable: no create/update/delete ability exists. */
    public function create(User $actor): bool
    {
        return false;
    }

    public function update(User $actor, AdminAuditLog $log): bool
    {
        return false;
    }

    public function delete(User $actor, AdminAuditLog $log): bool
    {
        return false;
    }
}
