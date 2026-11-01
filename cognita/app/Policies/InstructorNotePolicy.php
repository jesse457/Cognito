<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\InstructorNote;
use App\Models\User;

/**
 * Instructor notes are visible to their authoring instructor only — never to
 * students, never to other instructors. Admins are deliberately excluded: the
 * column is a private teaching journal, not moderation evidence.
 */
class InstructorNotePolicy
{
    public function view(User $actor, InstructorNote $note): bool
    {
        return (bool) config('features.instructor_path')
            && $note->instructor_id === $actor->getKey();
    }

    public function create(User $actor): bool
    {
        return (bool) config('features.instructor_path') && $actor->isInstructor();
    }

    public function update(User $actor, InstructorNote $note): bool
    {
        return $this->view($actor, $note);
    }

    public function delete(User $actor, InstructorNote $note): bool
    {
        return $this->view($actor, $note);
    }
}
