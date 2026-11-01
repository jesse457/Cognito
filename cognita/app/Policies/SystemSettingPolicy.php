<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

/**
 * System settings are owner-only, both to read and to write.
 */
class SystemSettingPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Owner);
    }

    public function view(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Owner);
    }

    public function update(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Owner);
    }

    public function reset(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Owner);
    }
}
