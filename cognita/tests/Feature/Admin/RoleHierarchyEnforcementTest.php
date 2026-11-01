<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature test 9 — rank hierarchy enforcement on the admin panel.
 */
class RoleHierarchyEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_cannot_promote_anyone_to_owner(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/role", [
                'role' => 'owner',
                'reason' => 'Attempted escalation.',
            ])
            ->assertForbidden();

        $this->assertSame('student', $student->fresh()->role->value);
    }

    public function test_an_admin_cannot_modify_another_admin_or_an_owner(): void
    {
        $admin = User::factory()->admin()->create();
        $peer = User::factory()->admin()->create();
        $owner = User::factory()->owner()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$peer->getKey()}/ban", ['reason' => 'Peer ban attempt.'])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$owner->getKey()}/ban", ['reason' => 'Owner ban attempt.'])
            ->assertForbidden();

        $this->assertSame('admin', $peer->fresh()->role->value);
        $this->assertSame('active', $owner->fresh()->status->value);
    }

    public function test_an_admin_cannot_read_or_write_system_settings(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/settings')->assertForbidden();
        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => ['kt_engine' => 'dkt']])
            ->assertForbidden();
    }

    public function test_an_admin_cannot_invite_another_admin_but_may_invite_a_moderator(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/staff/invitations', ['email' => 'new.admin@cognita.test', 'role' => 'admin'])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/staff/invitations', ['email' => 'new.mod@cognita.test', 'role' => 'moderator'])
            ->assertSuccessful();

        $this->assertDatabaseHas('staff_invitations', ['email' => 'new.mod@cognita.test', 'role' => 'moderator']);
    }

    public function test_a_moderator_cannot_ban_but_can_warn_and_suspend_within_thirty_days(): void
    {
        $moderator = User::factory()->moderator()->create();
        $student = User::factory()->create();

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/ban", ['reason' => 'Moderator ban attempt.'])
            ->assertForbidden();

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/warn", ['reason' => 'Please stay on topic.'])
            ->assertSuccessful();

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/suspend", ['reason' => 'Cooling off.', 'days' => 31])
            ->assertStatus(422);

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/suspend", ['reason' => 'Cooling off.', 'days' => 30])
            ->assertSuccessful();

        $this->assertSame('suspended', $student->fresh()->status->value);
        $this->assertNotNull($student->fresh()->suspended_until);
    }

    public function test_a_moderator_cannot_act_on_another_moderator(): void
    {
        $moderator = User::factory()->moderator()->create();
        $peer = User::factory()->moderator()->create();

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/users/{$peer->getKey()}/warn", ['reason' => 'Peer warning attempt.'])
            ->assertForbidden();
    }

    public function test_an_owner_can_do_all_of_it(): void
    {
        $owner = User::factory()->owner()->create();
        $student = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/role", [
                'role' => 'owner',
                'reason' => 'Second owner onboarding.',
            ])
            ->assertSuccessful();

        $this->assertSame('owner', $student->fresh()->role->value);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/admin/users/{$admin->getKey()}/ban", ['reason' => 'Policy violation.'])
            ->assertSuccessful();

        $this->assertSame('banned', $admin->fresh()->status->value);

        $this->actingAs($owner, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => ['kt_engine' => 'dkt']])
            ->assertSuccessful();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/admin/staff/invitations', ['email' => 'second.admin@cognita.test', 'role' => 'admin'])
            ->assertSuccessful();
    }

    public function test_an_owner_may_ban_a_peer_owner_but_an_admin_may_not(): void
    {
        $owner = User::factory()->owner()->create();
        $peerOwner = User::factory()->owner()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$peerOwner->getKey()}/ban", ['reason' => 'Admin cannot ban an owner.'])
            ->assertForbidden();

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/admin/users/{$peerOwner->getKey()}/ban", ['reason' => 'Owner revokes a compromised owner.'])
            ->assertSuccessful();

        $this->assertSame('banned', $peerOwner->fresh()->status->value);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $owner->getKey(),
            'action' => 'user.ban',
            'target_id' => $peerOwner->getKey(),
        ]);
    }

    public function test_an_owner_can_unban_and_audit_rows_are_written(): void
    {
        $owner = User::factory()->owner()->create();
        $banned = User::factory()->banned()->create();

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/admin/users/{$banned->getKey()}/unban")
            ->assertSuccessful();

        $this->assertSame('active', $banned->fresh()->status->value);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $owner->getKey(),
            'action' => 'user.unban',
            'target_type' => 'user',
            'target_id' => $banned->getKey(),
        ]);
    }
}
