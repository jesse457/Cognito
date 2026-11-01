<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * Feature test 13 — audited impersonation.
 */
class ImpersonationTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_impersonate_a_student_with_a_short_lived_claimed_token(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/impersonate")
            ->assertSuccessful();

        $token = $response->json('data.token');
        $this->assertIsString($token);
        $this->assertNotSame('', $token);
        $this->assertSame($admin->getKey(), $response->json('data.impersonated_by'));

        $accessToken = PersonalAccessToken::query()
            ->where('tokenable_id', $student->getKey())
            ->latest('id')
            ->firstOrFail();

        $this->assertContains('impersonate', $accessToken->abilities);
        $this->assertContains('impersonated_by:'.$admin->getKey(), $accessToken->abilities);
        $this->assertNotNull($accessToken->expires_at);
        $this->assertTrue($accessToken->expires_at->lessThanOrEqualTo(now()->addMinutes(16)));

        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->getKey(),
            'action' => 'impersonation.start',
            'target_type' => 'user',
            'target_id' => $student->getKey(),
        ]);
    }

    public function test_an_admin_cannot_impersonate_another_admin_or_an_owner(): void
    {
        $admin = User::factory()->admin()->create();
        $peer = User::factory()->admin()->create();
        $owner = User::factory()->owner()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$peer->getKey()}/impersonate")
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$owner->getKey()}/impersonate")
            ->assertForbidden();

        $this->assertSame(0, AdminAuditLog::query()->where('action', 'impersonation.start')->count());
    }

    public function test_stopping_an_impersonation_writes_an_audit_row(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/impersonate")
            ->assertSuccessful();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/impersonation/stop', [
                'token_id' => null,
            ])
            ->assertSuccessful();

        $this->assertSame(1, AdminAuditLog::query()->where('action', 'impersonation.start')->count());
        $this->assertSame(1, AdminAuditLog::query()->where('action', 'impersonation.stop')->count());
        $this->assertNotNull($response->json('data.token'));
    }

    public function test_moderators_and_students_cannot_impersonate(): void
    {
        $moderator = User::factory()->moderator()->create();
        $student = User::factory()->create();
        $victim = User::factory()->create();

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/users/{$victim->getKey()}/impersonate")
            ->assertForbidden();

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/admin/users/{$victim->getKey()}/impersonate")
            ->assertForbidden();
    }
}
