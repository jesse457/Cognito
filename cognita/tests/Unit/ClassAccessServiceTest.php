<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\EnrollmentStatus;
use App\Models\ClassEnrollment;
use App\Models\PrivateClass;
use App\Models\User;
use App\Services\ClassAccessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\InstructorEnabledTestCase;

/**
 * Unit coverage for the instructor portal's single data-scoping boundary.
 */
class ClassAccessServiceTest extends InstructorEnabledTestCase
{
    use RefreshDatabase;

    public function test_the_owning_instructor_can_resolve_their_class(): void
    {
        $instructor = User::factory()->instructor()->create();
        $class = PrivateClass::query()->create([
            'instructor_id' => $instructor->getKey(),
            'name' => 'Physics',
            'max_students' => 10,
        ]);

        $resolved = app(ClassAccessService::class)->assertInstructorOwnsClass($instructor, $class->getKey());

        $this->assertSame($class->getKey(), $resolved->getKey());
    }

    public function test_a_different_instructor_is_rejected(): void
    {
        $owner = User::factory()->instructor()->create();
        $intruder = User::factory()->instructor()->create();
        $class = PrivateClass::query()->create([
            'instructor_id' => $owner->getKey(),
            'name' => 'Physics',
            'max_students' => 10,
        ]);

        $this->assertForbidden(
            fn () => app(ClassAccessService::class)->assertInstructorOwnsClass($intruder, $class->getKey()),
        );
    }

    public function test_a_missing_class_is_a_404(): void
    {
        $instructor = User::factory()->instructor()->create();

        $this->expectException(HttpException::class);

        try {
            app(ClassAccessService::class)->assertInstructorOwnsClass($instructor, 424242);
        } catch (HttpException $exception) {
            $this->assertSame(404, $exception->getStatusCode());

            throw $exception;
        }
    }

    public function test_students_are_only_reachable_through_active_membership(): void
    {
        $instructor = User::factory()->instructor()->create();
        $class = PrivateClass::query()->create([
            'instructor_id' => $instructor->getKey(),
            'name' => 'Physics',
            'max_students' => 10,
        ]);

        $member = User::factory()->create();
        $outsider = User::factory()->create();

        ClassEnrollment::query()->create([
            'class_id' => $class->getKey(),
            'student_id' => $member->getKey(),
            'status' => EnrollmentStatus::Active,
            'enrolled_at' => now(),
        ]);

        $service = app(ClassAccessService::class);
        $service->assertStudentInClass($instructor, $member->getKey());
        $this->assertTrue(true);

        $this->assertForbidden(fn () => $service->assertStudentInClass($instructor, $outsider->getKey()));
    }

    private function assertForbidden(callable $callback): void
    {
        try {
            $callback();
            $this->fail('Expected a 403 HttpException.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }
    }
}
