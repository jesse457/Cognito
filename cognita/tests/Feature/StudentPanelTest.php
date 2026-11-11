<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\ClassDocument;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * The student panel: the searchable class list, one class's detail, the
 * attendance history and the class PDF library.
 *
 * The recurring assertion is the same as the rest of the app's: a student's
 * pages are scoped to their own memberships, and nothing from a class they did
 * not join can leak into a count or a row.
 */
class StudentPanelTest extends TestCase
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

    private function attend(User $student, Classroom $classroom, string $date, int $minutes = 12): AttendanceRecord
    {
        $joined = Carbon::parse($date.' 09:00:00');

        return AttendanceRecord::query()->create([
            'classroom_id' => $classroom->getKey(),
            'user_id' => $student->getKey(),
            'attended_on' => $date,
            'joined_at' => $joined,
            'last_seen_at' => $joined->copy()->addMinutes($minutes),
            'left_at' => $joined->copy()->addMinutes($minutes),
        ]);
    }

    private function document(Classroom $classroom, User $uploader, string $name, int $pages = 10, int $size = 2048): ClassDocument
    {
        return ClassDocument::query()->create([
            'classroom_id' => $classroom->getKey(),
            'uploaded_by' => $uploader->getKey(),
            'name' => $name,
            'path' => 'boards/'.$classroom->getKey().'/'.$name,
            'pages' => $pages,
            'size' => $size,
        ]);
    }

    public function test_the_class_list_contains_only_joined_classes_with_their_own_totals(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create(['instructor_id' => $instructor->getKey(), 'title' => 'Physics']);
        $mine = Classroom::factory()->forCourse($course)->create(['name' => 'Physics Cohort A']);
        $other = Classroom::factory()->create(['name' => 'Not Yours']);

        $student = User::factory()->student()->create();
        $this->enroll($student, $mine);
        $this->enroll(User::factory()->student()->create(), $other);

        $this->attend($student, $mine, now()->toDateString(), 12);
        $this->document($mine, $instructor, 'Lecture 1.pdf');

        $this->actingAs($student)
            ->get('/my-classes/classes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Classrooms')
                ->where('stats.classes', 1)
                ->where('stats.courses', 1)
                ->where('stats.materials', 1)
                ->has('classrooms', 1)
                ->where('classrooms.0.name', 'Physics Cohort A')
                ->where('classrooms.0.course', 'Physics')
                ->where('classrooms.0.sessions', 1)
                ->where('classrooms.0.time_in_class', '12 min')
                ->where('classrooms.0.days', 1)
                ->where('classrooms.0.materials', 1)
                ->where('classrooms.0.last_attended', 'In the call today')
                ->where('classrooms.0.live', false)
            );

        $this->actingAs($student)
            ->get('/my-classes/classes?q=not+yours')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Classrooms')
                ->has('classrooms', 0)
            );
    }

    public function test_a_student_can_open_a_class_they_joined(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create([
            'instructor_id' => $instructor->getKey(),
            'name' => 'Physics Cohort A',
        ]);
        $student = User::factory()->student()->create();
        $this->enroll($student, $classroom);
        $this->attend($student, $classroom, now()->toDateString(), 25);
        $this->document($classroom, $instructor, 'Lecture 1.pdf', 12, 4096);

        $this->actingAs($student)
            ->get("/my-classes/classes/{$classroom->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Classroom')
                ->where('classroom.name', 'Physics Cohort A')
                ->where('classroom.members', 1)
                ->where('classroom.class_days', 1)
                ->where('summary.sessions', 1)
                ->where('summary.days', 1)
                ->where('summary.time_in_class', '25 min')
                ->has('recent', 1)
                ->has('materials', 1)
                ->where('materials.0.name', 'Lecture 1.pdf')
                ->where('materials.0.pages', 12)
            );
    }

    public function test_a_student_cannot_open_a_class_they_never_joined(): void
    {
        $classroom = Classroom::factory()->create();
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->get("/my-classes/classes/{$classroom->id}")
            ->assertForbidden();
    }

    public function test_attendance_history_is_scoped_to_the_student_and_can_be_filtered_by_class(): void
    {
        $classroomA = Classroom::factory()->create(['name' => 'Physics A']);
        $classroomB = Classroom::factory()->create(['name' => 'Physics B']);
        $student = User::factory()->student()->create();
        $this->enroll($student, $classroomA);
        $this->enroll($student, $classroomB);

        $this->attend($student, $classroomA, now()->toDateString(), 10);
        $this->attend($student, $classroomA, now()->subDay()->toDateString(), 20);
        $this->attend($student, $classroomB, now()->subDays(2)->toDateString(), 30);

        // A classmate's record must never appear in this student's history.
        $this->attend(User::factory()->student()->create(), $classroomA, now()->toDateString(), 99);

        $this->actingAs($student)
            ->get('/my-classes/attendance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Attendance')
                ->where('summary.sessions', 3)
                ->where('summary.days', 3)
                ->where('summary.streak', 3)
                ->where('summary.time_in_class', '1 h')
                ->has('sessions', 3)
                ->has('classrooms', 2)
            );

        $this->actingAs($student)
            ->get('/my-classes/attendance?classroom='.$classroomB->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.classroom', $classroomB->id)
                ->where('summary.sessions', 1)
                ->where('summary.days', 1)
                ->has('sessions', 1)
                ->where('sessions.0.classroom', 'Physics B')
            );
    }

    public function test_materials_are_limited_to_joined_classes_and_searchable(): void
    {
        $instructor = User::factory()->instructor()->create();
        $mine = Classroom::factory()->create(['instructor_id' => $instructor->getKey(), 'name' => 'Mine']);
        $other = Classroom::factory()->create(['name' => 'Elsewhere']);
        $student = User::factory()->student()->create();
        $this->enroll($student, $mine);

        $this->document($mine, $instructor, 'Lecture 1.pdf');
        $this->document($mine, $instructor, 'Experiment guide.pdf', 4, 512);
        $this->document($other, $instructor, 'Secret.pdf');

        $this->actingAs($student)
            ->get('/my-classes/materials')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Student/Materials')
                ->where('stats.documents', 2)
                ->where('stats.classes', 1)
                ->where('stats.pages', 14)
                ->has('documents', 2)
            );

        $this->actingAs($student)
            ->get('/my-classes/materials?q=experiment')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.documents', 1)
                ->has('documents', 1)
                ->where('documents.0.name', 'Experiment guide.pdf')
            );
    }
}
