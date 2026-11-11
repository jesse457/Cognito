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
        Storage::fake('local');

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/board/document", [
            'document' => UploadedFile::fake()->createWithContent('deck.pdf', '%PDF-1.4 deck'),
        ])->assertOk();

        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'pdf', 'pages' => 8, 'page' => 3])
            ->assertOk()
            ->assertJsonPath('data.surface', 'pdf')
            ->assertJsonPath('data.page', 3)
            ->assertJsonPath('data.pages', 8);

        $board = $classroom->board->fresh();

        $this->assertSame('pdf', $board->surface->value);
        $this->assertSame(3, $board->page);
    }

    public function test_the_pdf_page_survives_a_trip_through_the_canvas(): void
    {
        Storage::fake('local');

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/board/document", [
            'document' => UploadedFile::fake()->createWithContent('deck.pdf', '%PDF-1.4 deck'),
        ])->assertOk();

        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'pdf', 'pages' => 8, 'page' => 5])
            ->assertOk()
            ->assertJsonPath('data.page', 5);

        // The canvas holds one page, but the deck under it does not move.
        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'canvas', 'page' => 1])
            ->assertOk()
            ->assertJsonPath('data.surface', 'canvas')
            ->assertJsonPath('data.page', 1)
            ->assertJsonPath('data.pages', 1)
            ->assertJsonPath('data.pdfPage', 5);

        $this->assertSame(5, $classroom->board->fresh()->page);

        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'pdf'])
            ->assertOk()
            ->assertJsonPath('data.surface', 'pdf')
            ->assertJsonPath('data.page', 5)
            ->assertJsonPath('data.pages', 8);
    }

    public function test_the_canvas_is_the_other_surface_and_holds_one_page(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'canvas', 'page' => 4])
            ->assertOk()
            ->assertJsonPath('data.surface', 'canvas')
            ->assertJsonPath('data.pages', 1)
            ->assertJsonPath('data.page', 1);

        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'notebook'])
            ->assertStatus(422);
    }

    public function test_students_cannot_change_the_board(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->member($student, $classroom);

        $classroom->board->update(['students_can_annotate' => true]);

        $this->actingAs($student)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'canvas'])
            ->assertForbidden();

        $this->actingAs($student)
            ->patchJson("/classes/{$classroom->id}/board", ['students_can_annotate' => true])
            ->assertForbidden();
    }

    public function test_the_server_refuses_to_store_drawings(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", [
                'strokes' => [
                    ['id' => 1, 'tool' => 'pen', 'color' => '#0b57d0', 'width' => 0.004, 'page' => 1, 'points' => [[0.1, 0.1], [0.2, 0.25]]],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Drawings live in the room only. The board saves its surface, page and permissions.');

        // Nothing about that request reached a table: no room was created and
        // the board itself is untouched.
        $this->assertDatabaseCount('call_sessions', 0);
        $this->assertDatabaseMissing('call_sessions', ['classroom_id' => $classroom->id]);
    }

    public function test_the_board_state_never_carries_ink(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $state = $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", ['surface' => 'canvas'])
            ->assertOk()
            ->json('data');

        $this->assertSame([], $state['strokes']);
        $this->assertNull($state['session']);
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

    public function test_uploaded_pdfs_stay_in_the_class_library_and_can_be_selected_again(): void
    {
        Storage::fake('local');

        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->member($student, $classroom);

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/board/document", [
            'document' => UploadedFile::fake()->createWithContent('first.pdf', '%PDF-1.4 first deck'),
        ])->assertOk()->assertJsonPath('data.document.name', 'first.pdf');

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/board/document", [
            'document' => UploadedFile::fake()->createWithContent('second.pdf', '%PDF-1.4 second deck'),
        ])->assertOk()->assertJsonPath('data.document.name', 'second.pdf');

        $this->assertDatabaseCount('class_documents', 2);

        $first = $classroom->documents()->where('name', 'first.pdf')->firstOrFail();
        $second = $classroom->documents()->where('name', 'second.pdf')->firstOrFail();

        Storage::disk('local')->assertExists($first->path);
        Storage::disk('local')->assertExists($second->path);

        // The newer deck is on the board, but the first one was not deleted.
        $this->assertSame($second->id, $classroom->board->fresh()->document_id);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/board/documents/{$first->id}/present")
            ->assertOk()
            ->assertJsonPath('data.surface', 'pdf')
            ->assertJsonPath('data.document.name', 'first.pdf');

        $this->assertSame($first->id, $classroom->board->fresh()->document_id);

        // Students can reuse the stream but cannot change which PDF is shown.
        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/board/documents/{$second->id}/present")
            ->assertForbidden();
    }

    public function test_a_stored_pdf_streams_with_range_and_cache_validators(): void
    {
        Storage::fake('local');

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->member($student, $classroom);

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/board/document", [
            'document' => UploadedFile::fake()->createWithContent('deck.pdf', '%PDF-1.4 stream me'),
        ])->assertOk();

        $document = $classroom->documents()->firstOrFail();
        $url = "/classes/{$classroom->id}/board/documents/{$document->id}";

        $response = $this->actingAs($student)->get($url);

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('max-age=2592000', (string) $response->headers->get('Cache-Control'));

        $etag = (string) $response->headers->get('ETag');

        $this->assertNotSame('', $etag);

        $this->actingAs($student)
            ->withHeader('If-None-Match', $etag)
            ->get($url)
            ->assertStatus(304);

        $this->flushHeaders();

        $this->actingAs($student)
            ->withHeader('Range', 'bytes=0-3')
            ->get($url)
            ->assertStatus(206)
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_a_document_from_another_class_cannot_be_selected_or_streamed(): void
    {
        Storage::fake('local');

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $otherClassroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)->postJson("/classes/{$otherClassroom->id}/board/document", [
            'document' => UploadedFile::fake()->createWithContent('other.pdf', '%PDF-1.4 other deck'),
        ])->assertOk();

        $document = $otherClassroom->documents()->firstOrFail();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/board/documents/{$document->id}/present")
            ->assertNotFound();

        $this->actingAs($instructor)
            ->get("/classes/{$classroom->id}/board/documents/{$document->id}")
            ->assertNotFound();
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
