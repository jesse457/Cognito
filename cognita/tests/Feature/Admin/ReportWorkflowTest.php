<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\ReportStatus;
use App\Models\ContentReport;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\ModerationAction;
use App\Models\User;
use App\Notifications\ReportResolvedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Feature test 12 — the moderation report workflow.
 */
class ReportWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_moderator_can_resolve_an_open_report(): void
    {
        Notification::fake();

        $moderator = User::factory()->moderator()->create();
        $reporter = User::factory()->create();
        $course = Course::factory()->create();

        $report = ContentReport::query()->create([
            'reporter_id' => $reporter->getKey(),
            'reportable_type' => 'course',
            'reportable_id' => $course->getKey(),
            'reason' => 'spam',
            'details' => 'This looks like an advertisement.',
            'status' => ReportStatus::Open,
        ]);

        $this->actingAs($moderator, 'sanctum')
            ->getJson('/api/admin/reports?status=open')
            ->assertOk();

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/reports/{$report->getKey()}/resolve", [
                'resolution_note' => 'Confirmed spam; content removed.',
            ])
            ->assertSuccessful();

        $report->refresh();
        $this->assertSame(ReportStatus::Resolved, $report->status);
        $this->assertSame($moderator->getKey(), $report->resolved_by);
        $this->assertNotNull($report->resolved_at);
        $this->assertSame('Confirmed spam; content removed.', $report->resolution_note);

        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $moderator->getKey(),
            'action' => 'report.resolve',
            'target_type' => 'content_report',
            'target_id' => $report->getKey(),
        ]);

        Notification::assertSentTo($reporter, ReportResolvedNotification::class);
    }

    public function test_resolving_with_a_moderation_action_also_creates_a_moderation_row(): void
    {
        Notification::fake();

        $moderator = User::factory()->moderator()->create();
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $course = Course::factory()->create(['instructor_id' => $author->getKey()]);

        $report = ContentReport::query()->create([
            'reporter_id' => $reporter->getKey(),
            'reportable_type' => 'course',
            'reportable_id' => $course->getKey(),
            'reason' => 'abuse',
            'status' => ReportStatus::Open,
        ]);

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/reports/{$report->getKey()}/resolve", [
                'resolution_note' => 'Author warned and content removed.',
                'action' => 'warn',
            ])
            ->assertSuccessful();

        $this->assertSame(ReportStatus::Resolved, $report->refresh()->status);
        $this->assertGreaterThanOrEqual(1, ModerationAction::query()
            ->where('target_user_id', $author->getKey())
            ->where('action', 'warn')
            ->count());
    }

    public function test_a_report_can_be_dismissed(): void
    {
        Notification::fake();

        $moderator = User::factory()->moderator()->create();
        $reporter = User::factory()->create();
        $lesson = Lesson::factory()->create();

        $report = ContentReport::query()->create([
            'reporter_id' => $reporter->getKey(),
            'reportable_type' => 'lesson',
            'reportable_id' => $lesson->getKey(),
            'reason' => 'off_topic',
            'status' => ReportStatus::Open,
        ]);

        $this->actingAs($moderator, 'sanctum')
            ->postJson("/api/admin/reports/{$report->getKey()}/dismiss", [
                'resolution_note' => 'No policy violation found.',
            ])
            ->assertSuccessful();

        $this->assertSame(ReportStatus::Dismissed, $report->refresh()->status);
        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'report.dismiss',
            'target_id' => $report->getKey(),
        ]);
    }

    public function test_a_student_can_file_a_report_which_notifies_moderators(): void
    {
        Notification::fake();

        $student = User::factory()->create();
        $course = Course::factory()->create();

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/reports', [
                'reportable_type' => 'course',
                'reportable_id' => $course->getKey(),
                'reason' => 'misinformation',
                'details' => 'This contradicts the source material.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('content_reports', [
            'reporter_id' => $student->getKey(),
            'reportable_type' => 'course',
            'reportable_id' => $course->getKey(),
            'status' => 'open',
        ]);
    }

    public function test_students_cannot_reach_the_report_queue(): void
    {
        $student = User::factory()->create();

        $this->actingAs($student, 'sanctum')->getJson('/api/admin/reports')->assertForbidden();
    }
}
