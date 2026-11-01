<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\AdminAuditLog;
use App\Models\ContentReport;
use App\Models\Course;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Feature test 10 — every privileged action writes exactly one audit row with
 * actor, action, target and non-empty context.
 */
class AuditLogCompletenessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    public function test_each_moderation_action_writes_exactly_one_audit_row(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();

        $expectations = [
            'user.warn' => fn () => $this->actingAs($admin, 'sanctum')
                ->postJson("/api/admin/users/{$target->getKey()}/warn", ['reason' => 'Warning reason.']),
            'user.suspend' => fn () => $this->actingAs($admin, 'sanctum')
                ->postJson("/api/admin/users/{$target->getKey()}/suspend", ['reason' => 'Suspend reason.', 'days' => 5]),
            'user.ban' => fn () => $this->actingAs($admin, 'sanctum')
                ->postJson("/api/admin/users/{$target->getKey()}/ban", ['reason' => 'Ban reason.']),
            'user.unban' => fn () => $this->actingAs($admin, 'sanctum')
                ->postJson("/api/admin/users/{$target->getKey()}/unban", ['reason' => 'Unban reason.']),
        ];

        foreach ($expectations as $action => $request) {
            $before = AdminAuditLog::query()->where('action', $action)->count();

            $request()->assertSuccessful();

            $rows = AdminAuditLog::query()->where('action', $action)->get();

            $this->assertCount($before + 1, $rows, "Expected exactly one new [{$action}] audit row.");

            $row = $rows->last();
            $this->assertSame($admin->getKey(), $row->actor_id);
            $this->assertSame(UserRole::Admin->value, $row->actor_role);
            $this->assertSame('user', $row->target_type);
            $this->assertSame($target->getKey(), $row->target_id);
            $this->assertNotEmpty($row->context);
        }
    }

    public function test_a_role_change_writes_one_audit_row(): void
    {
        $owner = User::factory()->owner()->create();
        $student = User::factory()->create();

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/admin/users/{$student->getKey()}/role", [
                'role' => 'moderator',
                'reason' => 'Promoted to moderator.',
            ])
            ->assertSuccessful();

        $rows = AdminAuditLog::query()->where('action', 'user.role_change')->get();

        $this->assertCount(1, $rows);
        $this->assertSame($owner->getKey(), $rows->first()->actor_id);
        $this->assertSame($student->getKey(), $rows->first()->target_id);
        $this->assertSame('student', $rows->first()->context['previous_role']);
        $this->assertSame('moderator', $rows->first()->context['new_role']);
        $this->assertSame('Promoted to moderator.', $rows->first()->context['reason']);
    }

    public function test_course_removal_and_restore_write_one_row_each(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/courses/{$course->getKey()}/remove", ['reason' => 'Misleading content.'])
            ->assertSuccessful();

        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'course.remove',
            'target_type' => 'course',
            'target_id' => $course->getKey(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/courses/{$course->getKey()}/restore")
            ->assertSuccessful();

        $this->assertSame(1, AdminAuditLog::query()->where('action', 'course.remove')->count());
        $this->assertSame(1, AdminAuditLog::query()->where('action', 'course.restore')->count());
    }

    public function test_report_resolution_writes_one_row(): void
    {
        $moderator = User::factory()->moderator()->create();
        $course = Course::factory()->create();
        $report = ContentReport::query()->create([
            'reporter_id' => User::factory()->create()->getKey(),
            'reportable_type' => 'course',
            'reportable_id' => $course->getKey(),
            'reason' => 'spam',
            'status' => 'open',
        ]);

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/reports/{$report->getKey()}/resolve", [
                'resolution_note' => 'Removed the offending material.',
            ])
            ->assertSuccessful();

        $rows = AdminAuditLog::query()->where('action', 'report.resolve')->get();

        $this->assertCount(1, $rows);
        $this->assertSame($moderator->getKey(), $rows->first()->actor_id);
        $this->assertSame('content_report', $rows->first()->target_type);
        $this->assertSame($report->getKey(), $rows->first()->target_id);
        $this->assertNotEmpty($rows->first()->context);
    }

    public function test_setting_updates_write_one_row_each(): void
    {
        $owner = User::factory()->owner()->create();

        $this->actingAs($owner, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => ['at_risk_threshold' => 0.55]])
            ->assertSuccessful();

        $this->actingAs($owner, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => ['kt_engine' => 'dkt']])
            ->assertSuccessful();

        $rows = AdminAuditLog::query()->where('action', 'setting.update')->get();

        $this->assertCount(2, $rows);

        foreach ($rows as $row) {
            $this->assertSame($owner->getKey(), $row->actor_id);
            $this->assertNotEmpty($row->context);
            $this->assertArrayHasKey('key', $row->context);
        }

        $this->assertSame('dkt', SystemSetting::query()->where('key', 'kt_engine')->first()?->value['value']);
    }

    public function test_audit_rows_are_never_exposed_for_update_or_delete(): void
    {
        $owner = User::factory()->owner()->create();
        User::factory()->create();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/admin/users/'.User::factory()->create()->getKey().'/warn', ['reason' => 'Audit probe.'])
            ->assertSuccessful();

        $log = AdminAuditLog::query()->firstOrFail();

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/admin/audit-logs/{$log->getKey()}", ['action' => 'tampered'])
            ->assertNotFound();

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/admin/audit-logs/{$log->getKey()}")
            ->assertNotFound();
    }
}
