<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Feature test 8 — the admin panel is always mounted and rank-gated.
 */
class AdminPanelAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_students_and_instructors_are_rejected(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum')
            ->getJson('/api/admin/dashboard')->assertForbidden();

        $this->actingAs(User::factory()->instructor()->create(), 'sanctum')
            ->getJson('/api/admin/dashboard')->assertForbidden();
    }

    /** @return array<string, array{string}> */
    public static function staffRoles(): array
    {
        return [
            'moderator' => ['moderator'],
            'admin' => ['admin'],
            'owner' => ['owner'],
        ];
    }

    #[DataProvider('staffRoles')]
    public function test_staff_roles_can_reach_the_dashboard(string $role): void
    {
        $staff = User::factory()->{$role}()->create();

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertOk();
    }

    public function test_the_admin_panel_works_with_both_feature_flags_off(): void
    {
        config(['features.instructor_path' => false, 'features.social' => false]);

        $owner = User::factory()->owner()->create();

        $this->actingAs($owner, 'sanctum')->getJson('/api/admin/dashboard')->assertOk();
        $this->actingAs($owner, 'sanctum')->getJson('/api/admin/users')->assertOk();
        $this->actingAs($owner, 'sanctum')->getJson('/api/admin/reports')->assertOk();
        $this->actingAs($owner, 'sanctum')->getJson('/api/admin/settings')->assertOk();
        $this->actingAs($owner, 'sanctum')->getJson('/api/admin/audit-logs')->assertOk();
    }

    public function test_moderator_user_payload_is_redacted(): void
    {
        $moderator = User::factory()->moderator()->create();
        $student = User::factory()->create();

        $response = $this->actingAs($moderator, 'sanctum')
            ->getJson("/api/admin/users/{$student->getKey()}")
            ->assertOk();

        $this->assertNull($response->json('data.email'));

        $adminResponse = $this->actingAs(User::factory()->admin()->create(), 'sanctum')
            ->getJson("/api/admin/users/{$student->getKey()}")
            ->assertOk();

        $this->assertSame($student->email, $adminResponse->json('data.email'));
    }

    public function test_authenticated_guests_are_rejected(): void
    {
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
    }
}
