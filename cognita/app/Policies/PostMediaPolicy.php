<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PostMedia;
use App\Models\Question;
use App\Models\User;

/** Question attachments inherit their question's audience. */
class PostMediaPolicy
{
    public function view(User $actor, PostMedia $media): bool
    {
        return $media->mediable instanceof Question
            && app(QuestionPolicy::class)->view($actor, $media->mediable);
    }

    public function create(User $actor, PostMedia $media): bool
    {
        return $this->view($actor, $media);
    }

    public function delete(User $actor, PostMedia $media): bool
    {
        return $actor->is($media->uploader)
            || ($media->mediable instanceof Question
                && app(QuestionPolicy::class)->update($actor, $media->mediable));
    }
}
