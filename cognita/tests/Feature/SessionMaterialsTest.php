<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\MediaDisk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The PDFs an instructor attaches to an announced session.
 *
 * A material lives in the class library, but the student only sees the ones
 * their instructor ticked when scheduling, so they can download them before
 * the room opens.
 */
class SessionMaterialsTest extends TestCase
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

    private function upload(User $instructor, Classroom $classroom, string $name = 'notes.pdf'): void
    {
        $this->actingAs($instructor)
            ->post("/instructor/classes/{$classroom->id}/materials", [
                'document' => UploadedFile::fake()->createWithContent($name, '%PDF-1.4 '.$name),
            ])
            ->assertRedirect();
    }

    public function test_an_instructor_uploads_a_pdf_to_the_class_library_without_presenting_it(): void
    {
        Storage::fake(MediaDisk::name());

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->post("/instructor/classes/{$classroom->id}/materials", [
                'document' => UploadedFile::fake()->createWithContent('notes.pdf', '%PDF-1.4 notes'),
            ])
            ->assertRedirect();

        $document = $classroom->documents()->firstOrFail();

        $this->assertSame('notes.pdf', $document->name);
        $this->assertSame($instructor->id, $document->uploaded_by);
        Storage::disk(MediaDisk::name())->assertExists($document->path);

        // Uploading a material must not put it on the board by itself.
        $this->assertNull($classroom->board()->first()?->document_id);

        $this->actingAs($instructor)
            ->get("/instructor/classes/{$classroom->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Classroom')
                ->has('materials', 1)
                ->where('materials.0.name', 'notes.pdf')
            );
    }

    public function test_only_the_class_instructor_can_upload_or_remove_materials(): void
    {
        Storage::fake(MediaDisk::name());

        $instructor = User::factory()->instructor()->create();
        $other = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->member($student, $classroom);

        $file = UploadedFile::fake()->createWithContent('notes.pdf', '%PDF-1.4 notes');

        $this->actingAs($other)
            ->post("/instructor/classes/{$classroom->id}/materials", ['document' => $file])
            ->assertForbidden();

        $this->actingAs($student)
            ->post("/instructor/classes/{$classroom->id}/materials", ['document' => $file])
            ->assertForbidden();

        $this->upload($instructor, $classroom);
        $document = $classroom->documents()->firstOrFail();

        $this->actingAs($other)
            ->delete("/instructor/classes/{$classroom->id}/materials/{$document->id}")
            ->assertForbidden();

        $this->actingAs($student)
            ->delete("/instructor/classes/{$classroom->id}/materials/{$document->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('class_documents', ['id' => $document->id]);
    }

    public function test_scheduling_attaches_materials_from_the_same_class_only(): void
    {
        Storage::fake(MediaDisk::name());

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $otherClassroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->upload($instructor, $classroom, 'notes.pdf');
        $this->upload($instructor, $otherClassroom, 'other-class.pdf');

        $notes = $classroom->documents()->firstOrFail();
        $other = $otherClassroom->documents()->firstOrFail();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'title' => 'Momentum',
                'starts_at' => now()->addHour()->toIso8601String(),
                'document_ids' => [$notes->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.materials.0.id', $notes->id)
            ->assertJsonPath('data.materials.0.name', 'notes.pdf');

        $session = CallSession::query()->firstOrFail();

        $this->assertDatabaseHas('session_materials', [
            'call_session_id' => $session->id,
            'class_document_id' => $notes->id,
        ]);

        // A document from another class cannot be smuggled into this lesson.
        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'starts_at' => now()->addHours(3)->toIso8601String(),
                'document_ids' => [$other->id],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('document_ids.0');
    }

    public function test_a_student_sees_the_session_materials_before_it_starts_and_can_download_them(): void
    {
        Storage::fake(MediaDisk::name());

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $outsider = User::factory()->student()->create();
        $this->member($student, $classroom);

        $this->upload($instructor, $classroom, 'notes.pdf');
        $notes = $classroom->documents()->firstOrFail();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'starts_at' => now()->addHour()->toIso8601String(),
                'document_ids' => [$notes->id],
            ])
            ->assertOk();

        $this->actingAs($student)
            ->get("/my-classes/classes/{$classroom->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Classroom')
                ->where('sessions.0.state', 'waiting')
                ->where('sessions.0.materials.0.name', 'notes.pdf')
                ->where('sessions.0.materials.0.url', route('board.documents.show', [
                    'classroom' => $classroom->id,
                    'document' => $notes->id,
                ]))
            );

        $this->actingAs($student)
            ->get('/my-classes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('classrooms.0.next_session.materials.0.name', 'notes.pdf')
            );

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/board/documents/{$notes->id}")
            ->assertOk();

        $this->actingAs($outsider)
            ->get("/classes/{$classroom->id}/board/documents/{$notes->id}")
            ->assertForbidden();
    }

    public function test_removing_a_material_takes_it_out_of_the_library_and_off_sessions(): void
    {
        Storage::fake(MediaDisk::name());

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->upload($instructor, $classroom);
        $document = $classroom->documents()->firstOrFail();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'starts_at' => now()->addHour()->toIso8601String(),
                'document_ids' => [$document->id],
            ])
            ->assertOk();

        $this->actingAs($instructor)
            ->delete("/instructor/classes/{$classroom->id}/materials/{$document->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('class_documents', ['id' => $document->id]);
        $this->assertDatabaseMissing('session_materials', ['class_document_id' => $document->id]);
        Storage::disk(MediaDisk::name())->assertMissing($document->path);
    }
}
