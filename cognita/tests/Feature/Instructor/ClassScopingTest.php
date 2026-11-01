<?php

declare(strict_types=1);

namespace Tests\Feature\Instructor;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassEnrollment;
use App\Models\InstructorNote;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\InstructorEnabledTestCase;

/**
 * Feature test 7 (CRITICAL) — the instructor portal's data-scoping boundary.
 */
class ClassScopingTest extends InstructorEnabledTestCase
{
    use RefreshDatabase;

    private User $instructorA;

    private User $instructorB;

    private PrivateClass $classA;

    private PrivateClass $classB;

    private User $studentA;

    private User $studentB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->instructorA = User::factory()->instructor()->create();
        $this->instructorB = User::factory()->instructor()->create();
        $instructorA = $this->instructorA;
        $instructorB = $this->instructorB;

        $this->classA = PrivateClass::query()->create([
            'instructor_id' => $instructorA->getKey(),
            'name' => 'Class A',
            'max_students' => 10,
            'status' => ClassStatus::Active,
        ]);

        $this->classB = PrivateClass::query()->create([
            'instructor_id' => $instructorB->getKey(),
            'name' => 'Class B',
            'max_students' => 10,
            'status' => ClassStatus::Active,
        ]);

        $this->studentA = User::factory()->create();
        $this->studentB = User::factory()->create();

        ClassEnrollment::query()->create([
            'class_id' => $this->classA->getKey(),
            'student_id' => $this->studentA->getKey(),
            'status' => EnrollmentStatus::Active,
            'enrolled_at' => now(),
        ]);

        ClassEnrollment::query()->create([
            'class_id' => $this->classB->getKey(),
            'student_id' => $this->studentB->getKey(),
            'status' => EnrollmentStatus::Active,
            'enrolled_at' => now(),
        ]);
    }

    public function test_an_instructor_cannot_read_another_instructors_class_dashboard(): void
    {
        $this->actingAs($this->instructorB, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/dashboard")
            ->assertForbidden();

        $this->actingAs($this->instructorA, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/dashboard")
            ->assertOk();
    }

    public function test_an_instructor_cannot_drill_into_a_student_of_another_class(): void
    {
        $this->actingAs($this->instructorB, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/students/{$this->studentA->getKey()}")
            ->assertForbidden();

        $this->actingAs($this->instructorA, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/students/{$this->studentA->getKey()}")
            ->assertOk();
    }

    public function test_an_instructor_cannot_read_notes_by_id_from_another_class(): void
    {
        $note = InstructorNote::query()->create([
            'class_id' => $this->classA->getKey(),
            'student_id' => $this->studentA->getKey(),
            'instructor_id' => $this->instructorA->getKey(),
            'note' => 'Private observation about student A.',
        ]);

        $this->actingAs($this->instructorB, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/notes/{$note->getKey()}")
            ->assertForbidden();

        $this->actingAs($this->instructorA, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/notes/{$note->getKey()}")
            ->assertOk();
    }

    public function test_an_instructor_cannot_read_a_student_that_is_in_no_class_of_theirs(): void
    {
        $this->actingAs($this->instructorA, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/students/{$this->studentB->getKey()}")
            ->assertForbidden();

        $this->actingAs($this->instructorA, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/students/".PHP_INT_MAX)
            ->assertNotFound();
    }

    public function test_the_class_list_only_contains_owned_classes(): void
    {
        $response = $this->actingAs($this->instructorA, 'sanctum')
            ->getJson('/api/instructor/classes')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($this->classA->getKey(), $ids);
        $this->assertNotContains($this->classB->getKey(), $ids);
    }

    public function test_notes_are_never_exposed_to_students(): void
    {
        InstructorNote::query()->create([
            'class_id' => $this->classA->getKey(),
            'student_id' => $this->studentA->getKey(),
            'instructor_id' => $this->instructorA->getKey(),
            'note' => 'Never visible to the student.',
        ]);

        // Students cannot reach the portal at all (role gate + flag).
        $this->actingAs($this->studentA, 'sanctum')
            ->getJson("/api/instructor/classes/{$this->classA->getKey()}/students/{$this->studentA->getKey()}/notes")
            ->assertForbidden();
    }
}
