<?php

declare(strict_types=1);

namespace Tests\Feature\Instructor;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature test 5 — with the flag off the instructor routes do not exist.
 *
 * This asserts a 404 (route not mounted), not a 403, which is the whole point of
 * conditional route registration.
 */
class InstructorRoutesDisabledTest extends TestCase
{
    use RefreshDatabase;

    public function test_instructor_routes_are_not_mounted_when_the_flag_is_off(): void
    {
        config(['features.instructor_path' => false]);

        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor, 'sanctum')
            ->getJson('/api/instructor/dashboard')
            ->assertNotFound();

        $this->actingAs($instructor, 'sanctum')
            ->getJson('/api/instructor/classes')
            ->assertNotFound();
    }

    public function test_the_routes_do_not_exist_for_students_either(): void
    {
        config(['features.instructor_path' => false]);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->getJson('/api/instructor/dashboard')
            ->assertNotFound();
    }

    public function test_the_route_name_is_not_registered(): void
    {
        config(['features.instructor_path' => false]);

        $this->assertFalse(app('router')->has('instructor.dashboard'));
    }
}
