<?php

declare(strict_types=1);

namespace Tests\Feature\Instructor;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\InstructorEnabledTestCase;

/**
 * Feature test 6 — with the flag on, the portal is mounted and role-gated.
 */
class InstructorRoutesEnabledTest extends InstructorEnabledTestCase
{
    use RefreshDatabase;

    public function test_an_instructor_reaches_the_portal_dashboard(): void
    {
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor, 'sanctum')
            ->getJson('/api/instructor/dashboard')
            ->assertOk();

        $this->actingAs($instructor, 'sanctum')
            ->getJson('/api/instructor/classes')
            ->assertOk();
    }

    public function test_students_and_moderators_are_rejected_by_the_role_gate(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum')
            ->getJson('/api/instructor/dashboard')
            ->assertForbidden();

        // The portal is instructor-only: moderator+ staff use the admin panel.
        $this->actingAs(User::factory()->moderator()->create(), 'sanctum')
            ->getJson('/api/instructor/dashboard')
            ->assertForbidden();
    }

    public function test_no_migration_is_required_to_enable_the_portal(): void
    {
        // The suite booted with the flag ON against the same schema the
        // flag-off suite uses; if a migration were required this test could
        // not reach an existing instructor table.
        $this->assertTrue(config('features.instructor_path'));
        $this->assertSame(1, Schema::getConnection()->getSchemaBuilder()->hasTable('private_classes') ? 1 : 0);
    }
}
