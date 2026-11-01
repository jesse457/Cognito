<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\ContentReport;
use App\Models\User;

class ContentReportPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator);
    }

    public function view(User $actor, ContentReport $report): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator);
    }

    /** Any authenticated user may report content. */
    public function create(User $actor): bool
    {
        return true;
    }

    public function resolve(User $actor, ContentReport $report): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator) && ! $report->status->isClosed();
    }

    public function dismiss(User $actor, ContentReport $report): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator) && ! $report->status->isClosed();
    }

    public function assignToSelf(User $actor, ContentReport $report): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator);
    }
}
