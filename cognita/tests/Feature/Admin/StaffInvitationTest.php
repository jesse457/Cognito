<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\AdminAuditLog;
use App\Models\StaffInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Feature test 14 — staff invitations, rank rules and token acceptance.
 */
class StaffInvitationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    public function test_an_owner_can_invite_an_admin_and_a_moderator(): void
    {
        $owner = User::factory()->owner()->create();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/admin/staff/invitations', ['email' => 'admin.invite@cognita.test', 'role' => 'admin'])
            ->assertSuccessful();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/admin/staff/invitations', ['email' => 'mod.invite@cognita.test', 'role' => 'moderator'])
            ->assertSuccessful();

        $this->assertDatabaseHas('staff_invitations', ['email' => 'admin.invite@cognita.test', 'role' => 'admin']);
        $this->assertDatabaseHas('staff_invitations', ['email' => 'mod.invite@cognita.test', 'role' => 'moderator']);
        $this->assertSame(2, AdminAuditLog::query()->where('action', 'staff.invite')->count());
    }

    public function test_an_admin_may_only_invite_moderators(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/staff/invitations', ['email' => 'admin.invite2@cognita.test', 'role' => 'admin'])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/staff/invitations', ['email' => 'mod.invite2@cognita.test', 'role' => 'moderator'])
            ->assertSuccessful();
    }

    public function test_moderators_cannot_invite_anyone(): void
    {
        $moderator = User::factory()->moderator()->create();

        $this->actingAs($moderator, 'sanctum')
            ->postJson('/api/admin/staff/invitations', ['email' => 'nope@cognita.test', 'role' => 'moderator'])
            ->assertForbidden();
    }

    public function test_accepting_an_expired_token_fails(): void
    {
        $owner = User::factory()->owner()->create();

        $invitation = StaffInvitation::query()->create([
            'email' => 'expired@cognita.test',
            'role' => 'moderator',
            'invited_by' => $owner->getKey(),
            'expires_at' => now()->subDay(),
        ]);

        $this->postJson("/api/admin/staff/invitations/{$invitation->token}/accept", [
            'name' => 'Expired Invitee',
            'password' => 'password',
        ])->assertStatus(422);

        $this->assertDatabaseMissing('users', ['email' => 'expired@cognita.test']);
    }

    public function test_accepting_a_valid_token_creates_the_user_with_the_invited_role(): void
    {
        $owner = User::factory()->owner()->create();

        $invitation = StaffInvitation::query()->create([
            'email' => 'valid@cognita.test',
            'role' => 'admin',
            'invited_by' => $owner->getKey(),
            'expires_at' => now()->addDays(7),
        ]);

        $this->postJson("/api/admin/staff/invitations/{$invitation->token}/accept", [
            'name' => 'Valid Invitee',
            'password' => 'super-secret-password',
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'valid@cognita.test',
            'role' => 'admin',
            'name' => 'Valid Invitee',
        ]);

        $this->assertNotNull($invitation->refresh()->accepted_at);

        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'staff.invite_accept',
            'actor_id' => $owner->getKey(),
        ]);
    }

    public function test_a_token_cannot_be_accepted_twice(): void
    {
        $owner = User::factory()->owner()->create();

        $invitation = StaffInvitation::query()->create([
            'email' => 'twice@cognita.test',
            'role' => 'moderator',
            'invited_by' => $owner->getKey(),
            'expires_at' => now()->addDays(7),
        ]);

        $this->postJson("/api/admin/staff/invitations/{$invitation->token}/accept", [
            'name' => 'First Accept',
            'password' => 'super-secret-password',
        ])->assertSuccessful();

        $this->postJson("/api/admin/staff/invitations/{$invitation->token}/accept", [
            'name' => 'Second Accept',
            'password' => 'super-secret-password',
        ])->assertStatus(422);
    }
}
