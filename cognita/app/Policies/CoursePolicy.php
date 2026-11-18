<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\CourseStatus;
use App\Enums\Permission;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;

/** Course ownership, learner access and curriculum management. */
class CoursePolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->hasPermission(Permission::ManageCourses) || $actor->isAdmin();
    }

    public function view(User $actor, Course $course): bool
    {
        if ($actor->isAdmin() || $this->owns($actor, $course)) {
            return true;
        }

        return $course->status === CourseStatus::Published;
    }

    public function create(User $actor): bool
    {
        return $actor->hasPermission(Permission::ManageCourses);
    }

    public function update(User $actor, Course $course): bool
    {
        return $this->owns($actor, $course);
    }

    public function delete(User $actor, Course $course): bool
    {
        return $this->owns($actor, $course);
    }

    public function manageCurriculum(User $actor, Course $course): bool
    {
        return $actor->hasPermission(Permission::ManageCurriculum) && $this->owns($actor, $course);
    }

    /** Lessons, files, video and notes require a membership and, for paid courses, payment. */
    public function viewContent(User $actor, Course $course): bool
    {
        if ($actor->isAdmin() || $this->owns($actor, $course)) {
            return true;
        }

        if (! $actor->hasPermission(Permission::Learn) || $course->status !== CourseStatus::Published) {
            return false;
        }

        $enrollment = $this->enrollmentFor($actor, $course);

        return $enrollment !== null && (! $course->requiresPayment() || $enrollment->isPaid());
    }

    public function learn(User $actor, Course $course): bool
    {
        return $this->viewContent($actor, $course);
    }

    private function owns(User $actor, Course $course): bool
    {
        return (int) $course->instructor_id === (int) $actor->getKey();
    }

    private function enrollmentFor(User $actor, Course $course): ?Enrollment
    {
        return Enrollment::query()
            ->where('student_id', $actor->getKey())
            ->whereHas('classroom', fn ($query) => $query->where('course_id', $course->getKey()))
            ->first();
    }
}
