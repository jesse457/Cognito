<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * The two dashboards: what they count, and what they refuse to show.
 *
 * These assert the props the pages read — live rooms, people in calls, the
 * student's own history — so the numbers on the cards cannot silently stop
 * matching the database.
 */
class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function enroll(User $student, Classroom $classroom): void
    {
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);
    }

    public function test_the_instructor_dashboard_reports_live_rooms_and_the_students_in_them(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create(['instructor_id' => $instructor->getKey()]);
        $classroom = Classroom::factory()->forCourse($course)->create(['name' => 'Physics Cohort A']);
        $student = User::factory()->student()->create();
        $this->enroll($student, $classroom);

        // Five minutes after the key was accepted, the instructor opens the
        // session and the student joins it.
        $this->travel(5)->minutes();
        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/call/session/touch")->assertOk();
        $this->actingAs($student)->postJson("/classes/{$classroom->id}/call/token")->assertOk();

        $this->actingAs($instructor)
            ->get('/instructor')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Dashboard')
                ->where('stats.live_classes', 1)
                ->where('stats.in_call', 1)
                ->where('stats.classes', 1)
                ->where('stats.students', 1)
                ->where('stats.rooms_this_week', 1)
                ->where('classrooms.0.name', 'Physics Cohort A')
                ->where('classrooms.0.live', true)
                ->where('classrooms.0.in_call', 1)
                ->where('classrooms.0.last_session', 'Room is open')
                ->where('courses.0.students', 1)
                ->where('courses.0.classrooms_count', 1)
                ->has('activity', 2)
                ->where('activity.0.kind', 'call')
                ->where('activity.0.title', $student->name.' joined a call')
                ->where('activity.1.kind', 'enrolment')
            );
    }

    public function test_a_class_that_was_never_opened_says_so(): void
    {
        $instructor = User::factory()->instructor()->create();
        Classroom::factory()->create(['instructor_id' => $instructor->getKey(), 'name' => 'Physics Cohort B']);

        $this->actingAs($instructor)
            ->get('/instructor')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.live_classes', 0)
                ->where('stats.in_call', 0)
                ->where('stats.rooms_this_week', 0)
                ->where('stats.unassigned', 1)
                ->where('classrooms.0.live', false)
                ->where('classrooms.0.last_session', 'Not opened yet')
                ->has('activity', 0)
            );
    }

    public function test_a_closed_room_is_reported_as_the_last_time_the_class_met(): void
    {
        Http::fake(['*' => Http::response(null, 404)]);

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/call/session/touch")->assertOk();
        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/call/session/end")->assertOk();

        $this->actingAs($instructor)
            ->get('/instructor')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.live_classes', 0)
                ->where('classrooms.0.live', false)
                ->where('classrooms.0.last_session', 'Last open just now')
            );
    }

    public function test_the_student_dashboard_counts_their_own_classes_calls_and_time(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create(['instructor_id' => $instructor->getKey()]);
        $quiet = Classroom::factory()->forCourse($course)->create(['name' => 'Physics Cohort B']);
        $classroom = Classroom::factory()->forCourse($course)->create(['name' => 'Physics Cohort A']);

        $student = User::factory()->student()->create();
        $this->enroll($student, $quiet);
        $this->enroll($student, $classroom);

        // Somebody else's class must never reach this student's dashboard.
        $this->enroll(User::factory()->student()->create(), Classroom::factory()->create());

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/call/session/touch")->assertOk();

        $attended = now()->subDay()->setTime(9, 0);
        AttendanceRecord::query()->create([
            'classroom_id' => $quiet->getKey(),
            'user_id' => $student->getKey(),
            'attended_on' => $attended->toDateString(),
            'joined_at' => $attended,
            'last_seen_at' => $attended->copy()->addMinutes(12),
            'left_at' => $attended->copy()->addMinutes(12),
        ]);

        $this->actingAs($student)
            ->get('/my-classes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Home')
                ->where('stats.classes', 2)
                ->where('stats.courses', 1)
                ->where('stats.live', 1)
                ->where('stats.sessions', 1)
                ->where('stats.time_in_class', '12 min')
                ->has('courses', 1)
                ->where('courses.0.classes', 2)
                ->where('courses.0.live', true)
                ->has('classrooms', 2)
                ->where('classrooms.0.name', 'Physics Cohort A')
                ->where('classrooms.0.live', true)
                ->where('classrooms.0.last_attended', 'Not in a call yet')
                ->where('classrooms.1.name', 'Physics Cohort B')
                ->where('classrooms.1.live', false)
                ->where('classrooms.1.last_attended', 'Last in class yesterday')
                ->has('recent', 1)
                ->where('recent.0.classroom', 'Physics Cohort B')
                ->where('recent.0.when', 'Yesterday · 09:00')
                ->where('recent.0.duration', '12 min')
                ->where('recent.0.live', false)
            );
    }

    public function test_a_new_student_sees_an_empty_dashboard_rather_than_someone_elses_classes(): void
    {
        Classroom::factory()->create(['name' => 'Not Yours']);
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->get('/my-classes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.classes', 0)
                ->where('stats.live', 0)
                ->where('stats.time_in_class', '0s')
                ->has('classrooms', 0)
                ->has('courses', 0)
                ->has('recent', 0)
            );
    }
}
