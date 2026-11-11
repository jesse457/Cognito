<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use App\Services\BoardSessions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LiveEditingTest extends TestCase
{
    use RefreshDatabase;

    private function liveRoom(Classroom $classroom): CallSession
    {
        return app(BoardSessions::class)->open($classroom);
    }

    private function membership(User $student, Classroom $classroom): void
    {
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);
    }

    public function test_students_can_follow_the_teachers_page(): void
    {
        Storage::fake('local');

        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/board/document", [
            'document' => UploadedFile::fake()->createWithContent('deck.pdf', '%PDF-1.4 deck'),
        ])->assertOk();

        $classroom->board->fresh()->update(['document_pages' => 8, 'page' => 4]);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('board.page', 4)
                ->where('board.pages', 8)
                ->where('board.surface', 'pdf')
            );
    }

    public function test_a_late_joiner_lands_in_the_live_room_with_an_empty_canvas(): void
    {
        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);

        $room = $this->liveRoom($classroom);

        // The room token is how the browser knows it may draw at all; the ink
        // arrives over the realtime channel, never from the server.
        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('board.session', $room->token)
                ->where('board.strokes', [])
            );
    }

    public function test_students_get_the_board_read_only(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->membership($student, $classroom);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('role', 'participant')
                ->where('canManageBoard', false)
            );
    }

    public function test_tab_switch_resilience_flag_is_exposed(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('realtime.configured', true)
                ->where('realtime.driver', 'livekit')
                ->where('room', $classroom->roomName())
            );
    }

    public function test_the_call_page_is_mobile_safe(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $response = $this->actingAs($instructor)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk();
        $this->assertStringContainsString('viewport-fit=cover', $response->getContent());
    }
}
