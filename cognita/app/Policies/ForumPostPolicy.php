<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\ForumPost;
use App\Models\User;

class ForumPostPolicy
{
    public function viewAny(User $actor): bool
    {
        return true;
    }

    public function create(User $actor): bool
    {
        return (bool) config('features.social');
    }

    public function update(User $actor, ForumPost $post): bool
    {
        return (bool) config('features.social') && $post->user_id === $actor->getKey();
    }

    public function hide(User $actor, ForumPost $post): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator);
    }

    public function remove(User $actor, ForumPost $post): bool
    {
        return $actor->roleAtLeast(UserRole::Moderator);
    }
}
