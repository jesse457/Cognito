<?php

declare(strict_types=1);

namespace Tests\Feature\Shared;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassEnrollment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\InstructorEnabledTestCase;

/**
 * Feature test 18 — assigning a course to a class auto-enrolls active members
 * and respects the size caps.
 */
class ClassAssignmentTest extends InstructorEnabledTestCase
{
    use RefreshDatabase;

    public function test_assigning_a_course_enrolls_every_active_member(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create();
        $class = $this->classFor($instructor, maxStudents: 10);

        $members = User::factory()->count(2)->create();

        foreach ($members as $member) {
            ClassEnrollment::query()->create([
                'class_id' => $class->getKey(),
                'student_id' => $member->getKey(),
                'status' => EnrollmentStatus::Active,
                'enrolled_at' => now(),
            ]);
        }

        // A removed member must NOT be enrolled.
        $removed = User::factory()->create();
        ClassEnrollment::query()->create([
            'class_id' => $class->getKey(),
            'student_id' => $removed->getKey(),
            'status' => EnrollmentStatus::Removed,
            'enrolled_at' => now(),
        ]);

        $this->actingAs($instructor, 'sanctum')
            ->postJson("/api/instructor/classes/{$class->getKey()}/courses", [
                'course_id' => $course->getKey(),
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('class_course_assignments', [
            'class_id' => $class->getKey(),
            'course_id' => $course->getKey(),
            'assigned_by' => $instructor->getKey(),
        ]);

        foreach ($members as $member) {
            $this->assertDatabaseHas('enrollments', [
                'user_id' => $member->getKey(),
                'course_id' => $course->getKey(),
            ]);
        }

        $this->assertDatabaseMissing('enrollments', [
            'user_id' => $removed->getKey(),
            'course_id' => $course->getKey(),
        ]);

        // Idempotent: assigning again must not duplicate enrollments.
        $this->actingAs($instructor, 'sanctum')
            ->postJson("/api/instructor/classes/{$class->getKey()}/courses", [
                'course_id' => $course->getKey(),
            ])
            ->assertSuccessful();

        $this->assertSame(2, Enrollment::query()
            ->where('course_id', $course->getKey())
            ->count());
    }

    public function test_assignment_is_rejected_when_the_class_exceeds_its_capacity(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create();
        $class = $this->classFor($instructor, maxStudents: 1);

        foreach (User::factory()->count(2)->create() as $member) {
            ClassEnrollment::query()->create([
                'class_id' => $class->getKey(),
                'student_id' => $member->getKey(),
                'status' => EnrollmentStatus::Active,
                'enrolled_at' => now(),
            ]);
        }

        $this->actingAs($instructor, 'sanctum')
            ->postJson("/api/instructor/classes/{$class->getKey()}/courses", [
                'course_id' => $course->getKey(),
            ])
            ->assertStatus(422);
    }

    public function test_a_lesson_can_be_assigned_to_one_student(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->getKey(), 'sequence_order' => 1]);
        $lesson = Lesson::factory()->create(['module_id' => $module->getKey(), 'sequence_order' => 1]);
        $class = $this->classFor($instructor, maxStudents: 5);

        $student = User::factory()->create();
        ClassEnrollment::query()->create([
            'class_id' => $class->getKey(),
            'student_id' => $student->getKey(),
            'status' => EnrollmentStatus::Active,
            'enrolled_at' => now(),
        ]);

        $this->actingAs($instructor, 'sanctum')
            ->postJson("/api/instructor/classes/{$class->getKey()}/students/{$student->getKey()}/lessons", [
                'lesson_id' => $lesson->getKey(),
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('student_content_assignments', [
            'class_id' => $class->getKey(),
            'student_id' => $student->getKey(),
            'lesson_id' => $lesson->getKey(),
            'assigned_by' => $instructor->getKey(),
        ]);
    }

    private function classFor(User $instructor, int $maxStudents): PrivateClass
    {
        return PrivateClass::query()->create([
            'instructor_id' => $instructor->getKey(),
            'name' => 'Cohort '.$maxStudents,
            'max_students' => $maxStudents,
            'status' => ClassStatus::Active,
        ]);
    }
}
