<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ClassCourseAssignment;
use App\Models\Course;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Unique(class_id, course_id): each instance pairs a fresh class with a fresh course.
 *
 * @extends Factory<ClassCourseAssignment>
 */
class ClassCourseAssignmentFactory extends Factory
{
    /** @var class-string<ClassCourseAssignment> */
    protected $model = ClassCourseAssignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'class_id' => PrivateClass::factory(),
            'course_id' => Course::factory(),
            'assigned_by' => User::factory()->instructor(),
            'assigned_at' => now(),
        ];
    }

    /**
     * Assign a course to a class, with the class's own instructor as assigner.
     */
    public function forClassAndCourse(PrivateClass $class, Course $course): static
    {
        return $this->state(fn (array $attributes): array => [
            'class_id' => $class->getKey(),
            'course_id' => $course->getKey(),
            'assigned_by' => $class->instructor_id,
        ]);
    }
}
