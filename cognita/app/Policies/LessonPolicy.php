<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Section;
use App\Models\User;

/** Lessons are readable by the course audience and written by its owner. */
class LessonPolicy
{
    public function view(User $actor, Lesson $lesson): bool
    {
        $course = $lesson->course;

        if ($course === null) {
            return false;
        }

        $policy = app(CoursePolicy::class);

        if ($policy->manageCurriculum($actor, $course)) {
            return true;
        }

        return $lesson->status === LessonStatus::Published && $policy->viewContent($actor, $course);
    }

    public function create(User $actor, Section $section): bool
    {
        return $section->course !== null && app(CoursePolicy::class)->manageCurriculum($actor, $section->course);
    }

    public function update(User $actor, Lesson $lesson): bool
    {
        return $lesson->course !== null && app(CoursePolicy::class)->manageCurriculum($actor, $lesson->course);
    }

    public function delete(User $actor, Lesson $lesson): bool
    {
        return $this->update($actor, $lesson);
    }

    public function track(User $actor, Lesson $lesson): bool
    {
        return $lesson->status === LessonStatus::Published
            && $lesson->course !== null
            && app(CoursePolicy::class)->learn($actor, $lesson->course);
    }
}
