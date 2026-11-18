<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use App\Services\BoardSessions;
use App\Services\DrawPermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StudentDrawingTest extends TestCase
{
    use RefreshDatabase;

    private function member(User $student, Classroom $classroom): Enrollment
    {
        return Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
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

        app(BoardSessions::class)->open($classroom, $instructor);

        // The instructor hands the pen to one student and takes it from another.
        $this->actingAs($instructor)
            ->patchJson("/instructor/classes/{$classroom->id}/students/{$allowed->id}/drawing", ['can_draw' => true])
            ->assertOk()
            ->assertJsonPath('data.can_draw', true);

        $this->actingAs($instructor)
            ->patchJson("/instructor/classes/{$classroom->id}/students/{$revoked->id}/drawing", ['can_draw' => false])
            ->assertOk()
            ->assertJsonPath('data.can_draw', false);

        // The list the browser gates drawing on: the selected student is in it,
        // the revoked one is not. Drawings themselves never reach the server.
        $state = $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'canvas'])
            ->assertOk()
            ->json('data');

        $this->assertContains($allowed->id, $state['allowedDrawerIds']);
        $this->assertNotContains($revoked->id, $state['allowedDrawerIds']);
    }

    public function test_handing_over_the_pen_is_a_decision_about_this_lesson(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->member($student, $classroom);

        $response = $this->actingAs($instructor)
            ->patchJson("/instructor/classes/{$classroom->id}/students/{$student->id}/drawing", ['can_draw' => true])
            ->assertOk()
            ->assertJsonPath('data.can_draw', true);

        $this->assertContains($student->id, $response->json('data.board.allowedDrawerIds'));

        // Nothing about it is written down: no column holds it, so the next
        // lesson starts without it.
        $this->assertFalse(
            Schema::hasColumn('enrollments', 'can_draw'),
            'The draw permission must not be a column on the membership.',
        );
        $this->assertFalse(
            Schema::hasColumn('class_boards', 'students_can_annotate'),
            'The draw permission must not be a column on the board.',
        );
    }

    public function test_the_call_page_reflects_the_individual_permission(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->member($student, $classroom);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('canEditBoard', false)
                ->where('board.allowedDrawerIds', [])
            );

        app(DrawPermissions::class)->set((int) $classroom->id, (int) $student->id, true);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('canEditBoard', true)
                ->where('board.allowedDrawerIds', [(int) $student->id])
            );
    }

    public function test_the_pen_goes_back_to_the_instructor_when_the_class_ends(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->member($student, $classroom);

        $session = app(BoardSessions::class)->open($classroom, $instructor);

        app(DrawPermissions::class)->set((int) $classroom->id, (int) $student->id, true);

        $this->assertTrue(app(DrawPermissions::class)->permits((int) $classroom->id, (int) $student->id));

        app(BoardSessions::class)->end($session);

        // The permission belonged to the lesson, so it died with it.
        $this->assertFalse(app(DrawPermissions::class)->permits((int) $classroom->id, (int) $student->id));
    }

    public function test_the_class_page_offers_no_drawing_control(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->member($student, $classroom);

        // The pen is handed over inside the room, so the class page has
        // nothing to switch: it does not even report who may draw.
        $this->actingAs($instructor)
            ->get("/instructor/classes/{$classroom->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Classroom')
                ->missing('students.0.can_draw')
                ->missing('classroom.board.students_can_annotate')
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
