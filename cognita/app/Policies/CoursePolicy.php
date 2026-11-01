<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\CourseStatus;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\User;

/**
 * Course ownership policy.
 *
 * `update` degrades gracefully when the instructor path is disabled: only
 * admins/owners may update, and non-staff ownership grants nothing.
 */
class CoursePolicy
{
    public function viewAny(User $actor): bool
    {
        return true;
    }

    public function view(User $actor, Course $course): bool
    {
        if ($course->status === CourseStatus::Published) {
            return true;
        }

        return $this->managesCourse($actor, $course);
    }

    /** Courses are AI-generated for staff; instructors orchestrate, they don't author. */
    public function create(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
    }

    public function update(User $actor, Course $course): bool
    {
        if ($actor->roleAtLeast(UserRole::Admin)) {
            return true;
        }

        if (! config('features.instructor_path')) {
            return false;
        }

        return $actor->isInstructor() && $course->instructor_id === $actor->getKey();
    }

    public function remove(User $actor, Course $course): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
    }

    public function restore(User $actor, Course $course): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
    }

    public function delete(User $actor, Course $course): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
    }

    private function managesCourse(User $actor, Course $course): bool
    {
        if ($actor->roleAtLeast(UserRole::Admin)) {
            return true;
        }

        return config('features.instructor_path') === true
            && $actor->isInstructor()
            && $course->instructor_id === $actor->getKey();
    }
}
