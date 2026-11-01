<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\ForumThread;
use App\Models\User;

class ForumThreadPolicy
{
    public function viewAny(User $actor): bool
    {
        return true;
    }

    public function view(User $actor, ForumThread $thread): bool
    {
        return true;
    }

    public function create(User $actor): bool
    {
        return (bool) config('features.social');
    }

    public function update(User $actor, ForumThread $thread): bool
    {
        return (bool) config('features.social') && $thread->user_id === $actor->getKey();
    }

    public function lock(User $actor, ForumThread $thread): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator);
    }

    public function remove(User $actor, ForumThread $thread): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator);
    }
}
