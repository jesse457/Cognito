<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CourseStatus;
use App\Enums\LessonStatus;
use App\Enums\LessonType;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Section;
use App\Models\User;
use Database\Seeders\CourseSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseCatalogueTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_instructor_can_browse_a_published_course_but_not_open_its_content(): void
    {
        $owner = User::factory()->instructor()->create();
        $visitor = User::factory()->instructor()->create();
        $course = Course::factory()->create([
            'instructor_id' => $owner->getKey(),
            'status' => CourseStatus::Published,
        ]);
        $section = Section::query()->create([
            'course_id' => $course->getKey(),
            'title' => 'Week 1',
            'position' => 1,
        ]);
        $lesson = $section->lessons()->create([
            'title' => 'An introduction',
            'type' => LessonType::Article,
            'status' => LessonStatus::Published,
            'content' => 'Read this first.',
            'position' => 1,
        ]);

        $this->actingAs($visitor)
            ->get(route('community.courses.show', ['course' => $course]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Course')
                ->where('course.id', $course->getKey())
                ->where('owned', false)
                ->where('can_access', false)
                ->where('sections', [])
            );

        $this->actingAs($visitor)
            ->get(route('community.lessons.show', ['lesson' => $lesson]))
            ->assertForbidden();
    }

    public function test_a_student_sees_their_own_courses_flagged_in_the_catalogue(): void
    {
        $student = User::factory()->student()->create();
        $enrolled = Course::factory()->create();
        $classroom = Classroom::factory()->forCourse($enrolled)->create();
        Enrollment::factory()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
        ]);
        Course::factory()->create();

        $this->actingAs($student)
            ->get(route('community.courses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Courses')
                ->where('courses', fn ($courses): bool => count($courses) === 2
                    && collect($courses)->firstWhere('id', $enrolled->getKey())['enrolled'] === true
                    && collect($courses)->firstWhere('id', $enrolled->getKey())['owned'] === false
                    && collect($courses)->where('enrolled', true)->count() === 1
                )
            );
    }

    public function test_an_instructor_can_open_the_course_management_page(): void
    {
        $instructor = User::factory()->instructor()->create();
        Course::factory()->create(['instructor_id' => $instructor->getKey()]);

        $this->actingAs($instructor)
            ->get(route('instructor.courses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Courses')
                ->has('courses', 1)
            );
    }

    public function test_owned_and_enrolled_courses_are_kept_out_of_explore(): void
    {
        $student = User::factory()->student()->create();
        $enrolled = Course::factory()->create();
        $classroom = Classroom::factory()->forCourse($enrolled)->create();
        Enrollment::factory()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
        ]);
        $discover = Course::factory()->create();

        $this->actingAs($student)
            ->get(route('community.courses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('mine', fn ($rows): bool => count($rows) === 1
                    && $rows[0]['id'] === $enrolled->getKey())
                ->where('explore', fn ($rows): bool => count($rows) === 1
                    && $rows[0]['id'] === $discover->getKey())
            );
    }

    public function test_an_instructors_own_courses_are_not_in_explore(): void
    {
        $instructor = User::factory()->instructor()->create();
        $owned = Course::factory()->create(['instructor_id' => $instructor->getKey()]);
        Course::factory()->create();

        $this->actingAs($instructor)
            ->get(route('community.courses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('mine', fn ($rows): bool => count($rows) === 1
                    && $rows[0]['id'] === $owned->getKey()
                    && $rows[0]['owned'] === true)
                ->where('explore', fn ($rows): bool => count($rows) === 1
                    && $rows[0]['id'] !== $owned->getKey())
            );
    }

    public function test_a_draft_course_is_not_browsable(): void
    {
        $course = Course::factory()->create(['status' => CourseStatus::Draft]);
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->get(route('community.courses.show', ['course' => $course]))
            ->assertForbidden();
    }

    public function test_the_catalogue_seeder_mixes_free_paid_and_lessons(): void
    {
        $this->seed([UserSeeder::class, CourseSeeder::class]);

        $this->assertGreaterThanOrEqual(6, Course::query()->count());
        $this->assertGreaterThan(0, Course::query()->where('is_paid', true)->count());
        $this->assertGreaterThan(0, Course::query()->where('is_paid', false)->count());
        $this->assertGreaterThan(10, Lesson::query()->count());

        $paid = Course::query()->where('is_paid', true)->firstOrFail();
        $this->assertGreaterThan(0, $paid->price_cents);
        $this->assertGreaterThan(0, $paid->sections()->count());
    }
}
