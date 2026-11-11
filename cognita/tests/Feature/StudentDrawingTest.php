<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use App\Services\BoardSessions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentDrawingTest extends TestCase
{
    use RefreshDatabase;

    private function member(User $student, Classroom $classroom, bool $canDraw = true): Enrollment
    {
        return Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
            'can_draw' => $canDraw,
        ]);
    }

    public function test_the_instructor_can_select_which_students_may_draw(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $allowed = User::factory()->student()->create();
        $revoked = User::factory()->student()->create();
        $this->member($allowed, $classroom);
        $this->member($revoked, $classroom);

        $classroom->board->update(['students_can_annotate' => true]);
        app(BoardSessions::class)->open($classroom, $instructor);

        $this->actingAs($instructor)
            ->patchJson("/instructor/classes/{$classroom->id}/students/{$revoked->id}/drawing", ['can_draw' => false])
            ->assertOk()
            ->assertJsonPath('data.can_draw', false);

        $this->assertDatabaseHas('enrollments', [
            'classroom_id' => $classroom->id,
            'student_id' => $revoked->id,
            'can_draw' => false,
        ]);

        // The list the browser gates drawing on: the selected student is in it,
        // the revoked one is not. Drawings themselves never reach the server.
        $state = $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['students_can_annotate' => true])
            ->assertOk()
            ->json('data');

        $this->assertContains($allowed->id, $state['allowedDrawerIds']);
        $this->assertNotContains($revoked->id, $state['allowedDrawerIds']);
    }

    public function test_selecting_a_student_also_opens_student_drawing(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->member($student, $classroom, false);

        $this->assertFalse($classroom->board->students_can_annotate);

        $response = $this->actingAs($instructor)
            ->patchJson("/instructor/classes/{$classroom->id}/students/{$student->id}/drawing", ['can_draw' => true])
            ->assertOk()
            ->assertJsonPath('data.can_draw', true)
            ->assertJsonPath('data.board.studentsCanAnnotate', true);

        $this->assertContains($student->id, $response->json('data.board.allowedDrawerIds'));
        $this->assertTrue($classroom->board->fresh()->students_can_annotate);
    }

    public function test_the_call_page_reflects_the_individual_permission(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->member($student, $classroom, false);
        $classroom->board->update(['students_can_annotate' => true]);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('canEditBoard', false)
                ->where('board.studentsCanAnnotate', true)
                ->where('board.allowedDrawerIds', [])
            );
    }

    public function test_only_the_class_instructor_can_change_drawing_access(): void
    {
        $classroom = Classroom::factory()->create();
        $student = User::factory()->student()->create();
        $this->member($student, $classroom);

        $this->actingAs($student)
            ->patchJson("/instructor/classes/{$classroom->id}/students/{$student->id}/drawing", ['can_draw' => false])
            ->assertForbidden();
    }
}
