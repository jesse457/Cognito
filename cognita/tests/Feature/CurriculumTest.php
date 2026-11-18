<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CourseStatus;
use App\Enums\LessonProgressStatus;
use App\Enums\LessonStatus;
use App\Enums\LessonType;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The self-paced half of the LMS: a course is built from sections and lessons,
 * and a student may work through them without waiting for a live session.
 */
class CurriculumTest extends TestCase
{
    use RefreshDatabase;

    private function courseWithClassroom(): array
    {
        $course = Course::factory()->create();
        $classroom = Classroom::factory()->forCourse($course)->create();

        return [$course, $classroom];
    }

    private function enrolStudent(Classroom $classroom): User
    {
        $student = User::factory()->student()->create();

        Enrollment::factory()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
        ]);

        return $student;
    }

    private function lesson(Course $course, LessonStatus $status = LessonStatus::Published): Lesson
    {
        $section = Section::query()->create([
            'course_id' => $course->getKey(),
            'title' => 'Week 1 — Foundations',
            'description' => 'The first steps.',
            'position' => 1,
        ]);

        return $section->lessons()->create([
            'title' => 'What is momentum?',
            'type' => LessonType::Article,
            'status' => $status,
            'content' => 'Momentum is mass multiplied by velocity.',
            'duration_minutes' => 15,
            'position' => 1,
        ]);
    }

    public function test_an_instructor_builds_a_course_outline_of_sections_and_lessons(): void
    {
        $course = Course::factory()->create();
        $instructor = $course->instructor()->firstOrFail();

        $this->actingAs($instructor)
            ->post(route('instructor.courses.sections.store', ['course' => $course->getKey()]), [
                'title' => 'Week 1 — Foundations',
                'description' => 'The first steps.',
            ])
            ->assertRedirect();

        $section = Section::query()->where('course_id', $course->getKey())->firstOrFail();

        $this->actingAs($instructor)
            ->post(route('instructor.sections.lessons.store', ['section' => $section->getKey()]), [
                'title' => 'What is momentum?',
                'type' => LessonType::Article->value,
                'status' => LessonStatus::Published->value,
                'content' => 'Momentum is mass multiplied by velocity.',
                'duration_minutes' => 15,
            ])
            ->assertRedirect();

        $lesson = Lesson::query()->where('section_id', $section->getKey())->firstOrFail();

        $this->assertSame(LessonType::Article, $lesson->type);
        $this->assertSame(LessonStatus::Published, $lesson->status);

        $this->actingAs($instructor)
            ->get(route('instructor.courses.show', ['course' => $course->getKey()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Curriculum')
                ->where('sections.0.title', 'Week 1 — Foundations')
                ->where('sections.0.lessons.0.title', 'What is momentum?')
                ->where('sections.0.lessons.0.status', LessonStatus::Published->value)
            );
    }

    public function test_only_the_course_owner_may_manage_the_curriculum(): void
    {
        $course = Course::factory()->create();
        $other = User::factory()->instructor()->create();

        $this->actingAs($other)
            ->get(route('instructor.courses.show', ['course' => $course->getKey()]))
            ->assertForbidden();

        $this->actingAs($other)
            ->post(route('instructor.courses.sections.store', ['course' => $course->getKey()]), [
                'title' => 'Not my course',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('sections', ['course_id' => $course->getKey()]);
    }

    public function test_a_student_reads_a_published_lesson_without_any_live_session(): void
    {
        [$course, $classroom] = $this->courseWithClassroom();
        $student = $this->enrolStudent($classroom);
        $lesson = $this->lesson($course);

        $this->actingAs($student)
            ->get(route('student.courses.show', ['course' => $course->getKey()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Course')
                ->where('progress.total', 1)
                ->where('progress.completed', 0)
                ->where('sections.0.lessons.0.title', 'What is momentum?')
            );

        $this->actingAs($student)
            ->get(route('student.lessons.show', ['lesson' => $lesson->getKey()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Lesson')
                ->where('lesson.title', 'What is momentum?')
                ->where('lesson.type', LessonType::Article->value)
            );

        $progress = LessonProgress::query()
            ->where('user_id', $student->getKey())
            ->where('lesson_id', $lesson->getKey())
            ->firstOrFail();

        $this->assertSame(LessonProgressStatus::InProgress, $progress->status);
    }

    public function test_a_student_marks_a_lesson_complete_and_the_course_progress_follows(): void
    {
        [$course, $classroom] = $this->courseWithClassroom();
        $student = $this->enrolStudent($classroom);
        $lesson = $this->lesson($course);

        $this->actingAs($student)
            ->post(route('student.lessons.progress', ['lesson' => $lesson->getKey()]), [
                'status' => LessonProgressStatus::Completed->value,
                'watched_seconds' => 600,
            ])
            ->assertRedirect();

        $progress = LessonProgress::query()
            ->where('user_id', $student->getKey())
            ->where('lesson_id', $lesson->getKey())
            ->firstOrFail();

        $this->assertTrue($progress->isCompleted());
        $this->assertNotNull($progress->completed_at);
        $this->assertSame(600, (int) $progress->watched_seconds);

        $this->actingAs($student)
            ->get(route('student.courses.show', ['course' => $course->getKey()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('progress.completed', 1)
                ->where('progress.total', 1)
                ->where('progress.percent', 100)
            );
    }

    public function test_a_draft_course_is_hidden_from_the_student_course_list(): void
    {
        [$draftCourse, $draftClassroom] = $this->courseWithClassroom();
        $draftCourse->forceFill(['status' => CourseStatus::Draft])->save();
        $student = $this->enrolStudent($draftClassroom);

        [$publishedCourse, $publishedClassroom] = $this->courseWithClassroom();
        Enrollment::factory()->create([
            'classroom_id' => $publishedClassroom->getKey(),
            'student_id' => $student->getKey(),
        ]);

        $this->actingAs($student)
            ->get(route('student.courses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Courses')
                ->where('courses', fn ($courses): bool => count($courses) === 1
                    && $courses[0]['id'] === $publishedCourse->getKey())
            );
    }

    public function test_a_draft_lesson_is_hidden_from_students(): void
    {
        [$course, $classroom] = $this->courseWithClassroom();
        $student = $this->enrolStudent($classroom);
        $lesson = $this->lesson($course, LessonStatus::Draft);

        $this->actingAs($student)
            ->get(route('student.lessons.show', ['lesson' => $lesson->getKey()]))
            ->assertForbidden();

        $this->actingAs($student)
            ->post(route('student.lessons.progress', ['lesson' => $lesson->getKey()]), [
                'status' => LessonProgressStatus::Completed->value,
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('lesson_progress', ['lesson_id' => $lesson->getKey()]);
    }

    public function test_a_student_can_browse_a_course_without_opening_its_content(): void
    {
        [$course] = $this->courseWithClassroom();
        $lesson = $this->lesson($course);
        $outsider = User::factory()->student()->create();

        $this->actingAs($outsider)
            ->get(route('community.courses.show', ['course' => $course->getKey()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Course')
                ->where('enrolled', false)
                ->where('can_access', false)
                ->where('access_reason', 'enroll')
                ->where('sections', [])
                ->where('progress.total', 0)
            );

        $this->actingAs($outsider)
            ->get(route('community.lessons.show', ['lesson' => $lesson->getKey()]))
            ->assertForbidden();

        $this->actingAs($outsider)
            ->post(route('community.lessons.progress', ['lesson' => $lesson->getKey()]), [
                'status' => LessonProgressStatus::InProgress->value,
                'watched_seconds' => 600,
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('lesson_progress', ['lesson_id' => $lesson->getKey()]);
    }
}
