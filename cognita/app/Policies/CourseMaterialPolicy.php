<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\User;

/** Lesson files follow the course audience. */
class CourseMaterialPolicy
{
    public function view(User $actor, CourseMaterial $material): bool
    {
        return $material->course !== null && app(CoursePolicy::class)->viewContent($actor, $material->course);
    }

    public function create(User $actor, Course $course): bool
    {
        return app(CoursePolicy::class)->manageCurriculum($actor, $course);
    }

    public function delete(User $actor, CourseMaterial $material): bool
    {
        return $material->course !== null && app(CoursePolicy::class)->manageCurriculum($actor, $material->course);
    }
}
