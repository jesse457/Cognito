<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LessonStatus;
use App\Enums\LessonType;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\Enrollment;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaidCourseTest extends TestCase
{
    use RefreshDatabase;

    private function join(User $student, Classroom $classroom): void
    {
        $this->actingAs($student)
            ->post('/join', ['key' => $classroom->join_code])
            ->assertRedirect(route('call.show', ['classroom' => $classroom->id]));
    }

    private function openRoom(Classroom $classroom): void
    {
        $this->actingAs($classroom->instructor()->firstOrFail())
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'host');
    }

    public function test_a_paid_course_creates_an_unpaid_membership_and_locks_the_live_room(): void
    {
        $course = Course::factory()->paid(4900)->create();
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();

        $this->join($student, $classroom);

        $this->assertDatabaseHas('enrollments', [
            'classroom_id' => $classroom->id,
            'student_id' => $student->id,
            'payment_status' => 'unpaid',
            'amount_paid_cents' => 0,
        ]);

        $this->actingAs($student)
            ->get(route('call.show', ['classroom' => $classroom->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('role', 'participant')
                ->where('payment.required', true)
                ->where('payment.can_access', false)
                ->where('payment.status', 'unpaid')
                ->where('payment.price_cents', 4900)
                ->where('payment.price_label', '$49.00')
            );

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();

        $this->actingAs($student)
            ->get(route('student.classes.show', ['classroom' => $classroom->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('payment.required', true)
                ->where('payment.can_access', false)
                ->where(
                    'payment.payment_instructions',
                    'Pay by bank transfer and send the reference to your instructor.',
                )
            );
    }

    public function test_the_instructor_confirmation_unlocks_the_live_room(): void
    {
        $course = Course::factory()->paid(4900)->create();
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();

        $this->join($student, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();

        $this->actingAs($classroom->instructor()->firstOrFail())
            ->patch(route('instructor.classes.students.payment', [
                'classroom' => $classroom->id,
                'student' => $student->id,
            ]), ['payment_status' => 'paid'])
            ->assertRedirect();

        $enrollment = Enrollment::query()
            ->where('classroom_id', $classroom->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $this->assertTrue($enrollment->isPaid());
        $this->assertSame(4900, (int) $enrollment->amount_paid_cents);
        $this->assertNotNull($enrollment->paid_at);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'participant');

        $this->actingAs($student)
            ->get(route('call.show', ['classroom' => $classroom->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('payment.required', true)
                ->where('payment.can_access', true)
                ->where('payment.status', 'paid')
            );
    }

    public function test_a_student_can_report_a_payment_but_cannot_unlock_the_room_themselves(): void
    {
        $course = Course::factory()->paid()->create();
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();

        $this->join($student, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)
            ->post(route('student.payment.store', ['classroom' => $classroom->id]), [
                'payment_reference' => 'BANK-4821',
            ])
            ->assertRedirect();

        $enrollment = Enrollment::query()
            ->where('classroom_id', $classroom->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $this->assertTrue($enrollment->isPending());
        $this->assertSame('BANK-4821', $enrollment->payment_reference);

        // Reporting a payment is not proof: only the instructor's confirmation
        // hands out a token for the room.
        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();

        $this->actingAs($classroom->instructor()->firstOrFail())
            ->patch(route('instructor.classes.students.payment', [
                'classroom' => $classroom->id,
                'student' => $student->id,
            ]), ['payment_status' => 'paid'])
            ->assertRedirect();

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk();
    }

    public function test_a_payment_can_be_revoked_and_locks_the_room_again(): void
    {
        $course = Course::factory()->paid()->create();
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();

        Enrollment::factory()->paid(4900)->create([
            'classroom_id' => $classroom->id,
            'student_id' => $student->id,
        ]);

        $this->openRoom($classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk();

        $this->actingAs($classroom->instructor()->firstOrFail())
            ->patch(route('instructor.classes.students.payment', [
                'classroom' => $classroom->id,
                'student' => $student->id,
            ]), ['payment_status' => 'unpaid'])
            ->assertRedirect();

        $enrollment = Enrollment::query()
            ->where('classroom_id', $classroom->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $this->assertFalse($enrollment->isPaid());
        $this->assertNull($enrollment->paid_at);
        $this->assertSame(0, (int) $enrollment->amount_paid_cents);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();
    }

    public function test_only_the_instructors_own_confirmation_unlocks_the_room(): void
    {
        $course = Course::factory()->paid()->create();
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();

        Enrollment::factory()->create([
            'classroom_id' => $classroom->id,
            'student_id' => $student->id,
            'payment_status' => 'pending',
        ]);

        $otherInstructor = User::factory()->instructor()->create();
        $payload = ['payment_status' => 'paid'];

        $this->actingAs($otherInstructor)
            ->patch(route('instructor.classes.students.payment', [
                'classroom' => $classroom->id,
                'student' => $student->id,
            ]), $payload)
            ->assertForbidden();

        // A student cannot call the instructor endpoint either.
        $this->actingAs($student)
            ->patch(route('instructor.classes.students.payment', [
                'classroom' => $classroom->id,
                'student' => $student->id,
            ]), $payload)
            ->assertForbidden();

        $enrollment = Enrollment::query()
            ->where('classroom_id', $classroom->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $this->assertFalse($enrollment->isPaid());
    }

    public function test_a_free_course_membership_stays_free_and_opens_the_room(): void
    {
        $course = Course::factory()->create(['is_paid' => false, 'price_cents' => 0]);
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();

        $this->join($student, $classroom);
        $this->openRoom($classroom);

        $this->assertDatabaseHas('enrollments', [
            'classroom_id' => $classroom->id,
            'student_id' => $student->id,
            'payment_status' => 'free',
        ]);

        $this->actingAs($student)
            ->get(route('call.show', ['classroom' => $classroom->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('payment.required', false));

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'participant');
    }

    public function test_a_session_description_is_saved_and_shown_to_students(): void
    {
        $course = Course::factory()->create();
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();

        $this->join($student, $classroom);

        $this->actingAs($classroom->instructor()->firstOrFail())
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'title' => 'Momentum and impulse',
                'description' => 'Bring the green workbook. We start with the trolley experiment.',
                'starts_at' => now()->addMinutes(30)->toIso8601String(),
            ])
            ->assertOk()
            ->assertJsonPath(
                'data.description',
                'Bring the green workbook. We start with the trolley experiment.',
            );

        $this->assertDatabaseHas('call_sessions', [
            'classroom_id' => $classroom->id,
            'title' => 'Momentum and impulse',
            'description' => 'Bring the green workbook. We start with the trolley experiment.',
        ]);

        $this->actingAs($student)
            ->get(route('call.show', ['classroom' => $classroom->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('session.title', 'Momentum and impulse')
                ->where('session.description', 'Bring the green workbook. We start with the trolley experiment.')
            );
    }

    public function test_payment_unlocks_lessons_notes_and_files(): void
    {
        Storage::fake('local');

        $course = Course::factory()->paid(4900)->create();
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();
        $section = Section::query()->create([
            'course_id' => $course->getKey(),
            'title' => 'Week 1',
            'position' => 1,
        ]);
        $lesson = $section->lessons()->create([
            'title' => 'The first lesson',
            'type' => LessonType::Article,
            'status' => LessonStatus::Published,
            'content' => 'Paid lesson content.',
            'position' => 1,
        ]);
        $material = CourseMaterial::query()->create([
            'course_id' => $course->getKey(),
            'lesson_id' => $lesson->getKey(),
            'uploaded_by' => $course->instructor_id,
            'title' => 'Notes.pdf',
            'path' => 'courses/'.$course->getKey().'/notes.pdf',
            'disk' => 'local',
            'mime_type' => 'application/pdf',
            'size' => 100,
        ]);
        Storage::disk('local')->put($material->path, 'pdf bytes');

        $this->join($student, $classroom);

        $this->actingAs($student)
            ->get(route('community.courses.show', ['course' => $course]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('can_access', false)
                ->where('access_reason', 'payment')
                ->where('sections', [])
            );

        $this->actingAs($student)
            ->get(route('community.lessons.show', ['lesson' => $lesson]))
            ->assertForbidden();
        $this->actingAs($student)
            ->get(route('course-materials.show', ['material' => $material]))
            ->assertForbidden();

        $enrollment = $classroom->enrollmentFor($student);
        $this->actingAs($course->instructor()->firstOrFail())
            ->patch(route('instructor.classes.students.payment', [
                'classroom' => $classroom,
                'student' => $student,
            ]), ['payment_status' => 'paid'])
            ->assertRedirect();
        $this->assertTrue($enrollment->fresh()->isPaid());

        $this->actingAs($student)
            ->get(route('community.courses.show', ['course' => $course]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('can_access', true)
                ->where('sections.0.lessons.0.title', 'The first lesson')
            );

        $this->actingAs($student)
            ->get(route('community.lessons.show', ['lesson' => $lesson]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('lesson.content', 'Paid lesson content.')
                ->has('lesson.materials', 1)
                ->where('lesson.materials.0.kind', 'pdf')
            );
        $this->actingAs($student)
            ->get(route('course-materials.show', ['material' => $material]))
            ->assertOk();
    }
}
