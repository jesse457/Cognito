<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AttendanceTest extends TestCase
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

    private function openRoom(Classroom $classroom): CallSession
    {
        $instructor = $classroom->instructor()->firstOrFail();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/touch")
            ->assertOk();

        return $classroom->callSessions()->latest('id')->firstOrFail();
    }

    public function test_a_student_join_starts_an_attendance_record(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->membership($student, $classroom);
        $session = $this->openRoom($classroom);

        $response = $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk();

        $record = AttendanceRecord::query()->firstOrFail();

        $this->assertSame($record->id, $response->json('data.attendance.id'));

        $this->assertSame($classroom->id, $record->classroom_id);
        $this->assertSame($session->id, $record->call_session_id);
        $this->assertSame($student->id, $record->user_id);
        $this->assertSame(now()->toDateString(), $record->attended_on->toDateString());
        $this->assertNull($record->left_at);
        $this->assertStringContainsString(
            "/classes/{$classroom->id}/call/attendance/{$record->id}/ping",
            $response->json('data.attendance.ping_url'),
        );
    }

    public function test_heartbeats_and_leaving_update_the_same_record(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->membership($student, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();

        $record = AttendanceRecord::query()->firstOrFail();
        $started = $record->last_seen_at;

        $this->travel(2)->minutes();

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/attendance/{$record->id}/ping")
            ->assertOk();

        $this->assertTrue($record->fresh()->last_seen_at->greaterThan($started));

        $this->travel(1)->minutes();

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/attendance/{$record->id}/leave")
            ->assertOk();

        $this->assertNotNull($record->fresh()->left_at);
        $this->assertSame(180, $record->fresh()->seconds());
    }

    public function test_another_student_cannot_touch_the_record(): void
    {
        $student = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->membership($student, $classroom);
        $this->membership($classmate, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();
        $record = AttendanceRecord::query()->firstOrFail();

        $this->actingAs($classmate)
            ->postJson("/classes/{$classroom->id}/call/attendance/{$record->id}/leave")
            ->assertForbidden();
    }

    public function test_the_host_token_does_not_create_attendance(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.attendance', null);

        $this->assertDatabaseCount('attendance_records', 0);
    }

    public function test_rejoining_keeps_the_same_attendance_row_for_the_session(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->membership($student, $classroom);
        $session = $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();
        $first = AttendanceRecord::query()->firstOrFail();
        $joined = $first->joined_at;

        $this->travel(2)->minutes();

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/attendance/{$first->id}/leave")
            ->assertOk();

        $this->travel(3)->minutes();

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();

        $record = $first->fresh();

        $this->assertSame(1, AttendanceRecord::query()->count());
        $this->assertSame($first->id, $record->id);
        $this->assertSame($session->id, $record->call_session_id);
        $this->assertTrue($record->joined_at->equalTo($joined));
        $this->assertNull($record->left_at);
        $this->assertSame(120, $record->present_seconds);
        $this->assertSame(120, $record->seconds());
    }

    public function test_a_waiting_student_is_attached_when_the_instructor_opens_the_class(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->membership($student, $classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.attendance', null);

        $this->assertDatabaseCount('attendance_records', 0);
        $this->assertDatabaseCount('call_sessions', 0);

        $session = $this->openRoom($classroom);

        $attached = $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/session/touch")
            ->assertOk()
            ->assertJsonPath('data.live', true);

        $record = AttendanceRecord::query()->firstOrFail();

        $this->assertSame($record->id, $attached->json('data.attendance.id'));
        $this->assertSame($session->id, $record->call_session_id);
    }

    public function test_ending_the_class_closes_open_attendance_and_a_late_ping_does_not_reopen_it(): void
    {
        Http::fake(['*' => Http::response(null, 404)]);

        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();
        $record = AttendanceRecord::query()->firstOrFail();

        $this->travel(2)->minutes();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/end")
            ->assertOk();

        $closed = $record->fresh();

        $this->assertNotNull($closed->left_at);
        $this->assertSame(120, $closed->present_seconds);

        $this->travel(5)->minutes();

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/attendance/{$record->id}/ping")
            ->assertOk();

        $this->assertNotNull($record->fresh()->left_at);
        $this->assertSame(120, $record->fresh()->present_seconds);
    }

    public function test_the_instructor_class_page_shows_the_attendance_summary(): void
    {
        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $absent = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);
        $this->membership($absent, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();

        $this->actingAs($instructor)
            ->get("/instructor/classes/{$classroom->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('attendance.date', now()->toDateString())
                ->where('attendance.present', 1)
                ->where('attendance.absent', 1)
            );
    }

    public function test_attendance_downloads_as_excel(): void
    {
        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();

        $response = $this->actingAs($instructor)
            ->get("/instructor/classes/{$classroom->id}/attendance/export/xlsx?date=".now()->toDateString())
            ->assertOk();

        $this->assertStringContainsString('spreadsheetml', (string) $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment;', (string) $response->headers->get('Content-Disposition'));
    }

    public function test_attendance_downloads_as_pdf(): void
    {
        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();

        $response = $this->actingAs($instructor)
            ->get("/instructor/classes/{$classroom->id}/attendance/export/pdf?date=".now()->toDateString())
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringStartsWith('%PDF', (string) $response->getContent());
    }

    public function test_only_the_class_instructor_can_export_attendance(): void
    {
        $classroom = Classroom::factory()->create();
        $student = User::factory()->student()->create();
        $this->membership($student, $classroom);

        $this->actingAs($student)
            ->get("/instructor/classes/{$classroom->id}/attendance/export/xlsx")
            ->assertForbidden();
    }

    public function test_the_instructor_gets_a_full_attendance_page(): void
    {
        $instructor = User::factory()->instructor()->create();

        // The register sorts by name, so give them names that sort predictably.
        $student = User::factory()->student()->create(['name' => 'Ana Alvarez']);
        $absent = User::factory()->student()->create(['name' => 'Zoe Zhang']);
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);
        $this->membership($absent, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();

        $this->actingAs($instructor)
            ->get("/instructor/classes/{$classroom->id}/attendance")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Attendance')
                ->where('classroom.id', $classroom->id)
                ->where('report.date', now()->toDateString())
                ->where('report.present', 1)
                ->where('report.absent', 1)
                ->where('report.total', 2)
                ->has('report.rows', 2)
                ->where('report.rows.0.status', 'Present')
                ->where('report.rows.1.status', 'Absent')
                ->where('report.rows.0.duration_seconds', 0)
                ->where('report.exports.xlsx', route('instructor.classes.attendance.export', [
                    'classroom' => $classroom->id, 'format' => 'xlsx', 'date' => now()->toDateString(),
                ]))
                ->where('report.exports.pdf', route('instructor.classes.attendance.export', [
                    'classroom' => $classroom->id, 'format' => 'pdf', 'date' => now()->toDateString(),
                ]))
            );
    }

    public function test_the_register_can_look_at_another_day(): void
    {
        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);
        $this->openRoom($classroom);

        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();

        $yesterday = now()->subDay()->toDateString();

        $this->actingAs($instructor)
            ->get("/instructor/classes/{$classroom->id}/attendance?date={$yesterday}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('report.date', $yesterday)
                ->where('report.present', 0)
                ->where('report.absent', 1)
                ->where('report.rows.0.status', 'Absent')
            );

        // A date that is not a date falls back to today rather than erroring.
        $this->actingAs($instructor)
            ->get("/instructor/classes/{$classroom->id}/attendance?date=2026-02-30")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('report.date', now()->toDateString()));
    }

    public function test_the_register_belongs_to_the_instructor_of_that_class(): void
    {
        $owner = User::factory()->instructor()->create();
        $other = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $owner->id]);
        $this->membership($student, $classroom);

        $this->actingAs($other)
            ->get("/instructor/classes/{$classroom->id}/attendance")
            ->assertForbidden();

        $this->actingAs($student)
            ->get("/instructor/classes/{$classroom->id}/attendance")
            ->assertForbidden();
    }

    public function test_the_call_page_links_the_host_to_the_register_and_nobody_else(): void
    {
        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);

        $this->actingAs($instructor)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('attendanceUrl', route('instructor.classes.attendance', ['classroom' => $classroom->id]))
            );

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('attendanceUrl', null));
    }
}
