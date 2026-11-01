<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\UserRole;
use App\Models\User;
use App\Services\AdminScopeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

/**
 * Unit coverage for the admin panel's single authorization boundary.
 */
class AdminScopeServiceTest extends TestCase
{
    use RefreshDatabase;

    private AdminScopeService $scope;

    protected function setUp(): void
    {
        parent::setUp();

        $this->scope = app(AdminScopeService::class);
    }

    public function test_moderators_cannot_manage_accounts_but_can_moderate_them(): void
    {
        $moderator = User::factory()->moderator()->create();
        $student = User::factory()->create();

        $this->assertForbidden(fn () => $this->scope->assertCanManageUser($moderator, $student));
        $this->scope->assertCanModerateUser($moderator, $student);

        $this->assertTrue(true);
    }

    public function test_moderators_cannot_moderate_peers_or_superiors(): void
    {
        $moderator = User::factory()->moderator()->create();
        $peer = User::factory()->moderator()->create();
        $admin = User::factory()->admin()->create();

        $this->assertForbidden(fn () => $this->scope->assertCanModerateUser($moderator, $peer));
        $this->assertForbidden(fn () => $this->scope->assertCanModerateUser($moderator, $admin));
    }

    public function test_admins_can_manage_lower_ranks_only(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        $peer = User::factory()->admin()->create();
        $owner = User::factory()->owner()->create();

        $this->scope->assertCanManageUser($admin, $student);
        $this->assertForbidden(fn () => $this->scope->assertCanManageUser($admin, $peer));
        $this->assertForbidden(fn () => $this->scope->assertCanManageUser($admin, $owner));
    }

    public function test_role_changes_cannot_escalate_beyond_the_actors_rank(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();

        $this->scope->assertCanChangeRole($admin, $student, UserRole::Moderator);
        $this->assertForbidden(fn () => $this->scope->assertCanChangeRole($admin, $student, UserRole::Owner));

        $owner = User::factory()->owner()->create();
        $this->scope->assertCanChangeRole($owner, $student, UserRole::Admin);
    }

    public function test_settings_are_owner_only(): void
    {
        $this->assertForbidden(fn () => $this->scope->assertCanAccessSettings(User::factory()->admin()->create()));
        $this->assertForbidden(fn () => $this->scope->assertCanAccessSettings(User::factory()->moderator()->create()));

        $this->scope->assertCanAccessSettings(User::factory()->owner()->create());
        $this->assertTrue(true);
    }

    public function test_report_moderation_requires_moderator_rank(): void
    {
        $this->assertForbidden(fn () => $this->scope->assertCanModerateReport(User::factory()->create()));

        $this->scope->assertCanModerateReport(User::factory()->moderator()->create());
        $this->assertTrue(true);
    }

    public function test_audit_log_access_requires_admin_rank(): void
    {
        $this->assertForbidden(fn () => $this->scope->assertCanViewAuditLogs(User::factory()->moderator()->create()));

        $this->scope->assertCanViewAuditLogs(User::factory()->admin()->create());
        $this->assertTrue(true);
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
