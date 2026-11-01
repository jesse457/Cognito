<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CourseStatus;
use App\Enums\ForumStatus;
use App\Enums\PostStatus;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use App\Support\AdminContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Course and forum content moderation.
 *
 * Every method writes exactly one `admin_audit_logs` row inside the same
 * transaction, with model-level auditing suppressed so the trait never adds a
 * second row.
 */
final class ModerationService
{
    public function __construct(
        private readonly AdminScopeService $scope,
        private readonly AuditLogService $auditLog,
        private readonly AdminContext $adminContext,
    ) {}

    public function removeCourse(User $actor, Course $course, string $reason): Course
    {
        if (! $actor->roleAtLeast(UserRole::Admin)) {
            abort(403, 'You must be an administrator to remove a course.');
        }

        $reason = $this->requireReason($reason);
        $previousStatus = $course->status;

        return $this->transaction(function () use ($actor, $course, $reason, $previousStatus): Course {
            $course->forceFill([
                'status' => CourseStatus::Removed,
                'removed_by' => $actor->getKey(),
                'removal_reason' => $reason,
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'course.remove',
                target: $course,
                context: [
                    'reason' => $reason,
                    'previous_status' => $previousStatus->value,
                    'new_status' => CourseStatus::Removed->value,
                    'course_title' => $course->title,
                ],
            );

            return $course->refresh();
        });
    }

    public function restoreCourse(User $actor, Course $course): Course
    {
        if (! $actor->roleAtLeast(UserRole::Admin)) {
            abort(403, 'You must be an administrator to restore a course.');
        }

        $previousStatus = $course->status;
        $previousReason = $course->removal_reason;

        return $this->transaction(function () use ($actor, $course, $previousStatus, $previousReason): Course {
            $course->forceFill([
                'status' => CourseStatus::Published,
                'removed_by' => null,
                'removal_reason' => null,
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'course.restore',
                target: $course,
                context: [
                    'previous_status' => $previousStatus->value,
                    'new_status' => CourseStatus::Published->value,
                    'cleared_removal_reason' => $previousReason,
                    'course_title' => $course->title,
                ],
            );

            return $course->refresh();
        });
    }

    public function lockThread(User $actor, ForumThread $thread): ForumThread
    {
        $this->scope->assertCanModerateContent($actor);

        $previousStatus = $thread->status;

        return $this->transaction(function () use ($actor, $thread, $previousStatus): ForumThread {
            $thread->forceFill(['status' => ForumStatus::Locked])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'forum.thread_lock',
                target: $thread,
                context: [
                    'previous_status' => $previousStatus->value,
                    'new_status' => ForumStatus::Locked->value,
                    'thread_title' => $thread->title,
                ],
            );

            return $thread->refresh();
        });
    }

    public function removeThread(User $actor, ForumThread $thread, string $reason): ForumThread
    {
        $this->scope->assertCanModerateContent($actor);

        $reason = $this->requireReason($reason);
        $previousStatus = $thread->status;

        return $this->transaction(function () use ($actor, $thread, $reason, $previousStatus): ForumThread {
            $thread->forceFill([
                'status' => ForumStatus::Removed,
                'removed_by' => $actor->getKey(),
                'removal_reason' => $reason,
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'forum.thread_remove',
                target: $thread,
                context: [
                    'reason' => $reason,
                    'previous_status' => $previousStatus->value,
                    'new_status' => ForumStatus::Removed->value,
                    'thread_title' => $thread->title,
                ],
            );

            return $thread->refresh();
        });
    }

    public function hidePost(User $actor, ForumPost $post, string $reason): ForumPost
    {
        $this->scope->assertCanModerateContent($actor);

        $reason = $this->requireReason($reason);
        $previousStatus = $post->status;

        return $this->transaction(function () use ($actor, $post, $reason, $previousStatus): ForumPost {
            $post->forceFill([
                'status' => PostStatus::Hidden,
                'hidden_by' => $actor->getKey(),
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'forum.post_hide',
                target: $post,
                context: [
                    'reason' => $reason,
                    'previous_status' => $previousStatus->value,
                    'new_status' => PostStatus::Hidden->value,
                    'thread_id' => $post->thread_id,
                ],
            );

            return $post->refresh();
        });
    }

    public function removePost(User $actor, ForumPost $post, string $reason): ForumPost
    {
        $this->scope->assertCanModerateContent($actor);

        $reason = $this->requireReason($reason);
        $previousStatus = $post->status;

        return $this->transaction(function () use ($actor, $post, $reason, $previousStatus): ForumPost {
            $post->forceFill([
                'status' => PostStatus::Removed,
                'hidden_by' => $actor->getKey(),
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'forum.post_remove',
                target: $post,
                context: [
                    'reason' => $reason,
                    'previous_status' => $previousStatus->value,
                    'new_status' => PostStatus::Removed->value,
                    'thread_id' => $post->thread_id,
                ],
            );

            return $post->refresh();
        });
    }

    /**
     * @template TReturn
     *
     * @param  callable(): TReturn  $callback
     * @return TReturn
     */
    private function transaction(callable $callback): mixed
    {
        return $this->adminContext->runWithoutModelAudit(
            static fn (): mixed => DB::transaction(static fn (): mixed => $callback()),
        );
    }

    private function requireReason(string $reason): string
    {
        $reason = trim($reason);

        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => 'A reason is required.',
            ]);
        }

        return $reason;
    }
}
