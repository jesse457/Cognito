<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LiveSessionStatus;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The life of a class session.
 *
 * Three rules are enforced here, because the whole waiting room depends on
 * them: only the instructor may announce or start a session, a student may
 * only enter a session that exists, and a session that has passed cannot be
 * entered again.
 */
class SessionTest extends TestCase
{
    use RefreshDatabase;

    private function membership(User $student, Classroom $classroom): void
    {
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);
    }

    public function test_an_instructor_can_run_a_session_with_no_course_at_all(): void
    {
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor)
            ->post(route('instructor.classes.store'), ['name' => 'Drop-in revision'])
            ->assertRedirect();

        $classroom = Classroom::query()->where('name', 'Drop-in revision')->firstOrFail();
        $this->assertNull($classroom->course_id);

        $this->actingAs($instructor)
            ->postJson(route('call.session.schedule', ['classroom' => $classroom]), [
                'title' => 'Thursday drop-in',
                'description' => 'Bring your own questions. No course required.',
                'starts_at' => now()->addDay()->toIso8601String(),
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Thursday drop-in')
            ->assertJsonPath('data.description', 'Bring your own questions. No course required.');

        $this->assertDatabaseHas('call_sessions', [
            'classroom_id' => $classroom->getKey(),
            'course_id' => null,
            'lesson_id' => null,
            'title' => 'Thursday drop-in',
        ]);
    }

    public function test_an_instructor_announces_a_session_and_a_student_waits_for_it(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->membership($student, $classroom);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'title' => 'Momentum problem set',
                'starts_at' => now()->addHour()->toIso8601String(),
                'ends_at' => now()->addHours(2)->toIso8601String(),
            ])
            ->assertOk()
            ->assertJsonPath('data.state', 'waiting');

        $this->assertDatabaseHas('call_sessions', [
            'classroom_id' => $classroom->id,
            'status' => LiveSessionStatus::Scheduled,
            'title' => 'Momentum problem set',
        ]);

        // The student is in the waiting room: the session exists, but nothing
        // is live yet.
        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('LiveCall/Room')
                ->where('role', 'participant')
                ->where('session.state', 'waiting')
                ->where('session.title', 'Momentum problem set')
            );

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();
    }

    public function test_a_student_may_not_announce_or_start_a_session(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->membership($student, $classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'starts_at' => now()->addHour()->toIso8601String(),
            ])
            ->assertForbidden();

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/session/start")
            ->assertForbidden();

        $this->assertDatabaseCount('call_sessions', 0);
    }

    public function test_a_student_joins_the_moment_the_instructor_starts_the_session(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->membership($student, $classroom);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'starts_at' => now()->addHour()->toIso8601String(),
            ])
            ->assertOk();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/start")
            ->assertOk()
            ->assertJsonPath('data.live', true);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'participant');

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('session.state', 'live'));
    }

    public function test_a_session_that_has_ended_cannot_be_rejoined(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->membership($student, $classroom);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/start")
            ->assertOk();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/end")
            ->assertOk()
            ->assertJsonPath('data.live', false);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('session.state', 'passed'));
    }

    public function test_a_session_whose_window_passed_without_opening_is_not_rejoinable(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->membership($student, $classroom);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/schedule", [
                'starts_at' => now()->subHours(2)->toIso8601String(),
                'ends_at' => now()->subHour()->toIso8601String(),
            ])
            ->assertOk()
            ->assertJsonPath('data.state', 'passed');

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('session.state', 'passed'));

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();
    }

    public function test_a_class_without_any_session_has_nothing_to_join(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->student()->create();
        $this->membership($student, $classroom);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('session.state', 'none'));

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();
    }
}
