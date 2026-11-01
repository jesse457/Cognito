<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A role was granted/changed through UserManagementService (audit row is written
 * by the service itself; this event only drives the target notification).
 */
class UserRoleChanged
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly User $target,
        public readonly UserRole $previousRole,
        public readonly UserRole $newRole,
        public readonly User $actor,
    ) {}
}
