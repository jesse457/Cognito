<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Course;
use App\Models\Section;
use App\Models\User;

/** Sections are part of the course curriculum. */
class SectionPolicy
{
    public function view(User $actor, Section $section): bool
    {
        return $section->course !== null && app(CoursePolicy::class)->view($actor, $section->course);
    }

    public function create(User $actor, Course $course): bool
    {
        return app(CoursePolicy::class)->manageCurriculum($actor, $course);
    }

    public function update(User $actor, Section $section): bool
    {
        return $section->course !== null && app(CoursePolicy::class)->manageCurriculum($actor, $section->course);
    }

    public function delete(User $actor, Section $section): bool
    {
        return $this->update($actor, $section);
    }
}
