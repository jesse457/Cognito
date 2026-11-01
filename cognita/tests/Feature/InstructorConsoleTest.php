<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassBoard;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstructorConsoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_instructor_creates_a_course_with_only_the_essential_fields(): void
    {
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor)
            ->post('/instructor/courses', ['title' => 'Applied Physics'])
            ->assertRedirect();

        $this->assertDatabaseHas('courses', [
            'title' => 'Applied Physics',
            'instructor_id' => $instructor->id,
            'description' => null,
        ]);
    }

    public function test_an_instructor_cannot_edit_another_instructors_course(): void
    {
        $other = Course::factory()->create();

        $this->actingAs(User::factory()->instructor()->create())
            ->patch("/instructor/courses/{$other->id}", ['title' => 'Hijacked'])
            ->assertForbidden();

        $this->assertSame('Hijacked' === $other->fresh()->title, false);
    }

    public function test_creating_a_class_generates_a_key_and_a_board(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create(['instructor_id' => $instructor->id]);

        $response = $this->actingAs($instructor)->post('/instructor/classes', [
            'name' => 'Physics Cohort A',
            'course_id' => $course->id,
        ]);

        $classroom = Classroom::query()->firstOrFail();

        $response->assertRedirect(route('instructor.classes.show', ['classroom' => $classroom->id]));
        $this->assertSame(6, strlen($classroom->join_code));
        $this->assertSame($course->id, $classroom->course_id);
        $this->assertNotNull($classroom->board);
        $this->assertSame('canvas', $classroom->board->surface->value);
    }

    public function test_an_instructor_cannot_open_another_instructors_class(): void
    {
        $classroom = Classroom::factory()->create();

        $this->actingAs(User::factory()->instructor()->create())
            ->get("/instructor/classes/{$classroom->id}")
            ->assertForbidden();
    }

    public function test_the_class_key_can_be_rotated(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id, 'join_code' => 'OLDKEY']);

        $this->actingAs($instructor)
            ->post("/instructor/classes/{$classroom->id}/key")
            ->assertRedirect();

        $this->assertNotSame('OLDKEY', $classroom->fresh()->join_code);
    }

    public function test_deleting_a_class_removes_its_board(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->delete("/instructor/classes/{$classroom->id}")
            ->assertRedirect(route('instructor.dashboard'));

        $this->assertDatabaseCount('classrooms', 0);
        $this->assertSame(0, ClassBoard::query()->count());
    }
}
