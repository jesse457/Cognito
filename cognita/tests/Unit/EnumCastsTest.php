<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\ClassStatus;
use App\Enums\ContentType;
use App\Enums\CourseStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\ForumStatus;
use App\Enums\KtEngine;
use App\Enums\LeaderboardPeriod;
use App\Enums\ModerationAction;
use App\Enums\PostStatus;
use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\ClassEnrollment;
use App\Models\ContentReport;
use App\Models\Course;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\KnowledgeComponent;
use App\Models\LeaderboardEntry;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\PrivateClass;
use App\Models\StudentKcMastery;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Every string-enum column is stored as a string and cast back to a PHP enum.
 * This test round-trips each one through the database.
 */
class EnumCastsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_role_and_status_round_trip(): void
    {
        $user = User::factory()->admin()->create(['status' => UserStatus::Suspended, 'suspended_until' => now()->addDay()]);

        $fresh = $user->fresh();

        $this->assertSame(UserRole::Admin, $fresh->role);
        $this->assertSame(UserStatus::Suspended, $fresh->status);
        $this->assertSame('admin', $fresh->getRawOriginal('role'));
        $this->assertSame('suspended', $fresh->getRawOriginal('status'));
    }

    public function test_course_status_round_trips(): void
    {
        $course = Course::factory()->create(['status' => CourseStatus::Archived]);

        $this->assertSame(CourseStatus::Archived, $course->fresh()->status);
        $this->assertSame('archived', $course->fresh()->getRawOriginal('status'));
        $this->assertTrue($course->fresh()->is_ai_generated);
    }

    public function test_lesson_content_type_round_trips(): void
    {
        $module = Module::factory()->create();
        $lesson = Lesson::factory()->create(['module_id' => $module->getKey(), 'content_type' => ContentType::Quiz]);

        $this->assertSame(ContentType::Quiz, $lesson->fresh()->content_type);
        $this->assertSame('quiz', $lesson->fresh()->getRawOriginal('content_type'));
    }

    public function test_knowledge_tracing_engine_cast_round_trips(): void
    {
        $user = User::factory()->create();
        $component = KnowledgeComponent::factory()->create();

        $mastery = StudentKcMastery::query()->create([
            'user_id' => $user->getKey(),
            'knowledge_component_id' => $component->getKey(),
            'mastery_probability' => 0.4231,
            'model_used' => KtEngine::Dkt,
            'last_updated' => now(),
        ]);

        $fresh = $mastery->fresh();
        $this->assertSame(KtEngine::Dkt, $fresh->model_used);
        $this->assertSame('dkt', $fresh->getRawOriginal('model_used'));
        $this->assertSame('0.4231', $fresh->mastery_probability);
    }

    public function test_gamification_enums_round_trip(): void
    {
        $user = User::factory()->create();
        $course = Course::factory()->create();

        $entry = LeaderboardEntry::query()->create([
            'course_id' => $course->getKey(),
            'user_id' => $user->getKey(),
            'score' => 10,
            'period' => LeaderboardPeriod::Weekly,
        ]);

        $this->assertSame(LeaderboardPeriod::Weekly, $entry->fresh()->period);
    }

    public function test_forum_and_class_enums_round_trip(): void
    {
        $user = User::factory()->create();
        $course = Course::factory()->create();

        $thread = ForumThread::query()->create([
            'course_id' => $course->getKey(),
            'user_id' => $user->getKey(),
            'title' => 'Thread',
            'body' => 'Body',
            'status' => ForumStatus::Locked,
        ]);

        $post = ForumPost::query()->create([
            'thread_id' => $thread->getKey(),
            'user_id' => $user->getKey(),
            'body' => 'Reply',
            'status' => PostStatus::Hidden,
        ]);

        $this->assertSame(ForumStatus::Locked, $thread->fresh()->status);
        $this->assertSame(PostStatus::Hidden, $post->fresh()->status);

        $instructor = User::factory()->instructor()->create();
        $class = PrivateClass::query()->create([
            'instructor_id' => $instructor->getKey(),
            'name' => 'Class',
            'max_students' => 10,
            'status' => ClassStatus::Archived,
        ]);

        $enrollment = ClassEnrollment::query()->create([
            'class_id' => $class->getKey(),
            'student_id' => $user->getKey(),
            'status' => EnrollmentStatus::Removed,
            'enrolled_at' => now(),
        ]);

        $this->assertSame(ClassStatus::Archived, $class->fresh()->status);
        $this->assertSame(EnrollmentStatus::Removed, $enrollment->fresh()->status);
    }

    public function test_report_and_moderation_enums_round_trip(): void
    {
        $reporter = User::factory()->create();
        $course = Course::factory()->create();

        $report = ContentReport::query()->create([
            'reporter_id' => $reporter->getKey(),
            'reportable_type' => 'course',
            'reportable_id' => $course->getKey(),
            'reason' => ReportReason::Misinformation,
            'status' => ReportStatus::InReview,
        ]);

        $fresh = $report->fresh();
        $this->assertSame(ReportReason::Misinformation, $fresh->reason);
        $this->assertSame(ReportStatus::InReview, $fresh->status);
        $this->assertSame('course', $fresh->reportable_type);
        $this->assertInstanceOf(Course::class, $fresh->reportable);

        $actor = User::factory()->moderator()->create();
        $action = \App\Models\ModerationAction::query()->create([
            'target_user_id' => $reporter->getKey(),
            'actor_id' => $actor->getKey(),
            'action' => ModerationAction::Warn,
            'reason' => 'Be nice.',
        ]);

        $this->assertSame(ModerationAction::Warn, $action->fresh()->action);
    }
}
