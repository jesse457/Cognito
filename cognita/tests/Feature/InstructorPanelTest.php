<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * The extra instructor panel pages: the searchable class list, the cross-class
 * student roster and the attendance overview.
 */
class InstructorPanelTest extends TestCase
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

    private function attend(User $student, Classroom $classroom, string $date, int $minutes = 12, bool $open = false): AttendanceRecord
    {
        $joined = Carbon::parse($date.' 09:00:00');

        return AttendanceRecord::query()->create([
            'classroom_id' => $classroom->getKey(),
            'user_id' => $student->getKey(),
            'attended_on' => $date,
            'joined_at' => $joined,
            'last_seen_at' => $open ? now() : $joined->copy()->addMinutes($minutes),
            'left_at' => $open ? null : $joined->copy()->addMinutes($minutes),
        ]);
    }

    public function test_the_class_list_shows_only_owned_classes_and_filters_them(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create(['instructor_id' => $instructor->getKey(), 'title' => 'Physics']);
        $classA = Classroom::factory()->forCourse($course)->create(['name' => 'Physics A']);
        $classB = Classroom::factory()->create(['instructor_id' => $instructor->getKey(), 'name' => 'Physics B']);
        Classroom::factory()->create(['name' => 'Not Mine']);

        $student = User::factory()->student()->create();
        $this->enroll($student, $classA);

        $this->actingAs($instructor)->postJson("/classes/{$classA->id}/call/session/touch")->assertOk();

        $this->actingAs($instructor)
            ->get('/instructor/classes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Classrooms')
                ->where('stats.classes', 2)
                ->where('stats.students', 1)
                ->where('stats.live', 1)
                ->where('stats.unassigned', 1)
                ->has('classrooms', 2)
                ->has('courses', 1)
            );

        $this->actingAs($instructor)
            ->get('/instructor/classes?status=live')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('classrooms', 1)
                ->where('classrooms.0.name', 'Physics A')
                ->where('classrooms.0.live', true)
                ->where('classrooms.0.last_session', 'Room is open')
            );

        $this->actingAs($instructor)
            ->get('/instructor/classes?course='.$course->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('classrooms', 1)
                ->where('classrooms.0.name', 'Physics A')
            );

        $this->actingAs($instructor)
            ->get('/instructor/classes?q=physics+b')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('classrooms', 1)
                ->where('classrooms.0.name', 'Physics B')
            );
    }

    public function test_the_student_roster_joins_memberships_and_counts_calls(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classA = Classroom::factory()->create(['instructor_id' => $instructor->getKey(), 'name' => 'Class A']);
        $classB = Classroom::factory()->create(['instructor_id' => $instructor->getKey(), 'name' => 'Class B']);

        $alice = User::factory()->student()->create(['name' => 'Alice Anderson']);
        $bob = User::factory()->student()->create(['name' => 'Bob Brown']);
        $outsider = User::factory()->student()->create(['name' => 'Zed Outsider']);

        $this->enroll($alice, $classA);
        $this->enroll($alice, $classB);
        $this->enroll($bob, $classA);
        $this->enroll($outsider, Classroom::factory()->create(['name' => 'Elsewhere']));

        $this->attend($alice, $classA, now()->toDateString(), 10);
        $this->attend($alice, $classB, now()->toDateString(), 20);
        $this->attend($bob, $classA, now()->toDateString(), 5, open: true);

        $this->actingAs($instructor)
            ->get('/instructor/students')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Students')
                ->where('stats.students', 2)
                ->where('stats.seats', 3)
                ->where('stats.in_call', 1)
                ->where('stats.active_week', 2)
                ->has('classrooms', 2)
                ->has('students', 2)
                ->where('students.0.name', 'Alice Anderson')
                ->where('students.0.sessions', 2)
                ->where('students.0.days', 1)
                ->where('students.0.time_in_class', '30 min')
                ->has('students.0.classes', 2)
                ->where('students.1.name', 'Bob Brown')
                ->where('students.1.present', true)
                ->where('students.1.attended_today', true)
            );

        $this->actingAs($instructor)
            ->get('/instructor/students?q=alice')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('students', 1)
                ->where('students.0.name', 'Alice Anderson')
            );

        $this->actingAs($instructor)
            ->get('/instructor/students?classroom='.$classB->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('students', 1)
                ->where('students.0.name', 'Alice Anderson')
                ->where('filters.classroom', $classB->id)
            );
    }

    public function test_the_attendance_overview_counts_the_day_and_the_seven_day_trend(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classA = Classroom::factory()->create(['instructor_id' => $instructor->getKey(), 'name' => 'Class A']);
        $classB = Classroom::factory()->create(['instructor_id' => $instructor->getKey(), 'name' => 'Class B']);

        $students = User::factory()->count(3)->student()->create();
        $this->enroll($students[0], $classA);
        $this->enroll($students[1], $classA);
        $this->enroll($students[2], $classB);

        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $this->attend($students[0], $classA, $today, 10);
        $this->attend($students[1], $classA, $today, 8);
        $this->attend($students[0], $classA, $yesterday, 15);

        // Another instructor's attendance must not enter these totals.
        $this->attend(
            User::factory()->student()->create(),
            Classroom::factory()->create(['name' => 'Elsewhere']),
            $today,
            99,
        );

        $this->actingAs($instructor)
            ->get('/instructor/attendance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/AttendanceOverview')
                ->where('filters.date', $today)
                ->where('stats.classes', 2)
                ->where('stats.students', 3)
                ->where('stats.present', 2)
                ->where('stats.absent', 1)
                ->where('stats.rate', 67)
                ->has('report.rows', 2)
                ->where('report.rows.0.name', 'Class A')
                ->where('report.rows.0.present', 2)
                ->where('report.rows.0.absent', 0)
                ->where('report.rows.0.rate', 100)
                ->where('report.rows.1.name', 'Class B')
                ->where('report.rows.1.present', 0)
                ->where('report.rows.1.absent', 1)
                ->has('report.trend', 7)
                ->where('report.trend.5.present', 1)
                ->where('report.trend.6.present', 2)
            );

        $this->actingAs($instructor)
            ->get('/instructor/attendance?date='.$yesterday)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.date', $yesterday)
                ->where('stats.present', 1)
                ->where('stats.absent', 2)
                ->where('stats.rate', 33)
                ->where('report.trend.6.present', 1)
            );
    }
}
