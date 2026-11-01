<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BoardTest extends TestCase
{
    use RefreshDatabase;

    private function member(User $student, Classroom $classroom): void
    {
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);
    }

    public function test_the_instructor_switches_the_surface_and_the_page(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'notebook', 'page' => 2])
            ->assertOk()
            ->assertJsonPath('data.surface', 'notebook')
            ->assertJsonPath('data.page', 2);

        $this->assertSame('notebook', $classroom->board->fresh()->surface->value);
    }

    public function test_students_cannot_change_the_surface(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->member($student, $classroom);

        $classroom->board->update(['students_can_annotate' => true]);

        $this->actingAs($student)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'notebook'])
            ->assertForbidden();
    }

    public function test_students_can_send_strokes_only_when_the_instructor_allows_it(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->member($student, $classroom);

        $strokes = [[
            'id' => 1,
            'tool' => 'pen',
            'color' => '#0b57d0',
            'width' => 0.004,
            'page' => 1,
            'points' => [[0.1, 0.1], [0.2, 0.25]],
        ]];

        $this->actingAs($student)
            ->patchJson("/classes/{$classroom->id}/board", ['strokes' => $strokes])
            ->assertForbidden();

        $classroom->board->update(['students_can_annotate' => true]);

        $this->actingAs($student)
            ->patchJson("/classes/{$classroom->id}/board", ['strokes' => $strokes])
            ->assertOk()
            ->assertJsonPath('data.strokes.0.points.1.0', 0.2);
    }

    public function test_strokes_are_clamped_and_invalid_tools_dropped(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", [
                'strokes' => [
                    ['tool' => 'spray', 'color' => '#0b57d0', 'width' => 0.01, 'page' => 1, 'points' => [[0, 0]]],
                    ['tool' => 'pen', 'color' => 'javascript:alert(1)', 'width' => 9, 'page' => 1, 'points' => [[-1, 2]]],
                ],
            ])
            ->assertOk();

        $strokes = $classroom->board->fresh()->strokes;

        $this->assertCount(1, $strokes);
        $this->assertSame('#111827', $strokes[0]['color']);
        $this->assertSame(0.05, $strokes[0]['width']);
        $this->assertEquals([[0.0, 1.0]], $strokes[0]['points']);
    }

    public function test_only_the_instructor_can_upload_a_pdf(): void
    {
        Storage::fake('local');

        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->member($student, $classroom);

        $file = UploadedFile::fake()->create('lecture.pdf', 120, 'application/pdf');

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/board/document", ['document' => $file])
            ->assertForbidden();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/board/document", ['document' => $file])
            ->assertOk()
            ->assertJsonPath('data.surface', 'pdf');

        $board = $classroom->board->fresh();

        $this->assertSame('pdf', $board->surface->value);
        $this->assertSame('lecture.pdf', $board->document_name);
        Storage::disk('local')->assertExists($board->document_path);
    }

    public function test_the_document_streams_to_members_only(): void
    {
        Storage::fake('local');

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->member($student, $classroom);
        $outsider = User::factory()->student()->create();

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/board/document", [
            'document' => UploadedFile::fake()->create('deck.pdf', 40, 'application/pdf'),
        ]);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/board/document")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->actingAs($outsider)
            ->get("/classes/{$classroom->id}/board/document")
            ->assertForbidden();
    }
}
