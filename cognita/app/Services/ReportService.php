<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ModerationAction as ModerationActionEnum;
use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Events\ReportResolved;
use App\Models\ContentReport;
use App\Models\Course;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use App\Support\AdminContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Content-report queue handling: list, assign, resolve, dismiss, bulk resolve.
 *
 * Every mutating method writes exactly ONE `admin_audit_logs` row with
 * target_type `content_report`, inside the same transaction as the report
 * mutation (and any attached moderation action).
 */
final class ReportService
{
    public function __construct(
        private readonly AdminScopeService $scope,
        private readonly AuditLogService $auditLog,
        private readonly AdminContext $adminContext,
        private readonly UserManagementService $userManagement,
    ) {}

    /**
     * Paginated moderation queue.
     *
     * @param  array{status?:string|null, reason?:string|null, per_page?:int|null, page?:int|null}  $filters
     * @return LengthAwarePaginator<int, ContentReport>
     */
    public function listOpen(array $filters = []): LengthAwarePaginator
    {
        $query = ContentReport::query()
            ->with(['reporter', 'resolvedBy']);

        $status = $filters['status'] ?? null;

        if ($status !== null && $status !== '' && $status !== 'all') {
            $query->where('status', ReportStatus::from($status)->value);
        } elseif ($status !== 'all') {
            $query->awaitingAction();
        }

        $reason = $filters['reason'] ?? null;

        if ($reason !== null && $reason !== '') {
            $query->where('reason', ReportReason::from($reason)->value);
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        $perPage = max(1, min($perPage, 100));

        return $query->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', (int) ($filters['page'] ?? 1));
    }

    /**
     * Resolve a report, optionally applying a moderation action to the
     * offending author at the same time.
     */
    public function resolve(
        User $actor,
        ContentReport $report,
        string $resolutionNote,
        ?ModerationActionEnum $action = null,
        ?int $durationDays = null,
    ): ContentReport {
        $this->scope->assertCanModerateReport($actor);

        if ($report->status->isClosed()) {
            throw ValidationException::withMessages([
                'report' => 'This report is already closed.',
            ]);
        }

        $note = $this->requireNote($resolutionNote);
        $previousStatus = $report->status;
        $targetUser = $action === null ? null : $this->resolveReportAuthor($report);

        // A staff author that the actor cannot moderate (equal/higher rank) must
        // not silently vanish: reject with 422 so the moderator knows to resolve
        // the report without an attached account action.
        if ($action !== null && $targetUser !== null && ! $this->canModerate($actor, $targetUser)) {
            throw ValidationException::withMessages([
                'action' => sprintf(
                    'The report author (%s) has an equal or higher role rank than you; resolve the report without an account action.',
                    $targetUser->role->label(),
                ),
            ]);
        }

        $report = $this->transaction(function () use (
            $actor,
            $report,
            $note,
            $previousStatus,
            $action,
            $durationDays,
            $targetUser,
        ): ContentReport {
            $moderationActionId = null;

            if ($action !== null) {
                $moderationActionId = $this->applyModeration(
                    actor: $actor,
                    target: $targetUser,
                    action: $action,
                    reason: $note,
                    durationDays: $durationDays,
                );
            }

            $report->forceFill([
                'status' => ReportStatus::Resolved,
                'resolution_note' => $note,
                'resolved_by' => $actor->getKey(),
                'resolved_at' => now(),
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'report.resolve',
                target: $report,
                context: [
                    'resolution_note' => $note,
                    'previous_status' => $previousStatus->value,
                    'new_status' => ReportStatus::Resolved->value,
                    'report_reason' => $report->reason->value,
                    'moderation_action' => $action?->value,
                    'moderation_action_id' => $moderationActionId,
                    'target_user_id' => $targetUser?->getKey(),
                ],
            );

            return $report->refresh();
        });

        ReportResolved::dispatch($report, $actor);

        return $report;
    }

    public function dismiss(User $actor, ContentReport $report, string $resolutionNote): ContentReport
    {
        $this->scope->assertCanModerateReport($actor);

        if ($report->status->isClosed()) {
            throw ValidationException::withMessages([
                'report' => 'This report is already closed.',
            ]);
        }

        $note = $this->requireNote($resolutionNote);
        $previousStatus = $report->status;

        $report = $this->transaction(function () use ($actor, $report, $note, $previousStatus): ContentReport {
            $report->forceFill([
                'status' => ReportStatus::Dismissed,
                'resolution_note' => $note,
                'resolved_by' => $actor->getKey(),
                'resolved_at' => now(),
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'report.dismiss',
                target: $report,
                context: [
                    'resolution_note' => $note,
                    'previous_status' => $previousStatus->value,
                    'new_status' => ReportStatus::Dismissed->value,
                    'report_reason' => $report->reason->value,
                ],
            );

            return $report->refresh();
        });

        ReportResolved::dispatch($report, $actor);

        return $report;
    }

    public function assignToSelf(User $actor, ContentReport $report): ContentReport
    {
        $this->scope->assertCanModerateReport($actor);

        $previousStatus = $report->status;

        return $this->transaction(function () use ($actor, $report, $previousStatus): ContentReport {
            $report->forceFill(['status' => ReportStatus::InReview])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'report.assign',
                target: $report,
                context: [
                    'assigned_to' => $actor->getKey(),
                    'previous_status' => $previousStatus->value,
                    'new_status' => ReportStatus::InReview->value,
                    'report_reason' => $report->reason->value,
                ],
            );

            return $report->refresh();
        });
    }

    /**
     * @param  list<int>  $reportIds
     * @return int Number of reports resolved.
     */
    public function bulkResolve(User $actor, array $reportIds, string $resolutionNote): int
    {
        $this->scope->assertCanModerateReport($actor);

        $note = $this->requireNote($resolutionNote);

        $ids = array_values(array_unique(array_map(
            static fn (mixed $id): int => (int) $id,
            $reportIds,
        )));

        /** @var list<ContentReport> $reports */
        $reports = ContentReport::query()
            ->whereIn('id', $ids)
            ->get()
            ->all();

        $open = array_values(array_filter(
            $reports,
            static fn (ContentReport $report): bool => ! $report->status->isClosed(),
        ));

        if ($open === []) {
            return 0;
        }

        $resolved = $this->transaction(function () use ($actor, $open, $note): array {
            $now = now();
            $resolvedList = [];

            foreach ($open as $report) {
                $previousStatus = $report->status;

                $report->forceFill([
                    'status' => ReportStatus::Resolved,
                    'resolution_note' => $note,
                    'resolved_by' => $actor->getKey(),
                    'resolved_at' => $now,
                ])->save();

                $this->auditLog->record(
                    actor: $actor,
                    action: 'report.resolve',
                    target: $report,
                    context: [
                        'resolution_note' => $note,
                        'previous_status' => $previousStatus->value,
                        'new_status' => ReportStatus::Resolved->value,
                        'bulk' => true,
                        'report_reason' => $report->reason->value,
                    ],
                );

                $resolvedList[] = $report->refresh();
            }

            return $resolvedList;
        });

        foreach ($resolved as $report) {
            ReportResolved::dispatch($report, $actor);
        }

        return count($resolved);
    }

    /**
     * Applies the attached moderation action to the report's author.
     * Returns the created ModerationAction id, or null when the author cannot
     * be resolved (e.g. an orphaned thread) — the report still resolves.
     */
    private function applyModeration(
        User $actor,
        ?User $target,
        ModerationActionEnum $action,
        string $reason,
        ?int $durationDays,
    ): ?int {
        if ($target === null) {
            return null;
        }

        $moderationAction = match ($action) {
            ModerationActionEnum::Warn => $this->userManagement->warn($actor, $target, $reason),
            ModerationActionEnum::Suspend => $this->userManagement->suspend(
                $actor,
                $target,
                $reason,
                $durationDays ?? 7,
            ),
            ModerationActionEnum::Ban => $this->userManagement->ban($actor, $target, $reason),
            ModerationActionEnum::Unban => $this->userManagement->unban($actor, $target, $reason),
            ModerationActionEnum::Restore => null,
        };

        return $moderationAction?->getKey();
    }

    /**
     * Whether the actor may apply an account action to the report author.
     * Mirrors AdminScopeService's rank rule without aborting.
     */
    private function canModerate(User $actor, User $target): bool
    {
        return $actor->role->rank() >= UserRole::Moderator->rank()
            && $actor->role->rank() > $target->role->rank();
    }

    /**
     * Best-effort author resolution for the reported content.
     */
    public function resolveReportAuthor(ContentReport $report): ?User
    {
        $reportable = $report->reportable;

        if ($reportable === null) {
            return null;
        }

        $authorId = match (true) {
            $reportable instanceof Course => $reportable->instructor_id ?? $reportable->created_by,
            $reportable instanceof ForumThread => $reportable->user_id,
            $reportable instanceof ForumPost => $reportable->user_id,
            default => null,
        };

        if ($authorId === null) {
            return null;
        }

        return User::query()->find($authorId);
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

    private function requireNote(string $note): string
    {
        $note = trim($note);

        if ($note === '') {
            throw ValidationException::withMessages([
                'resolution_note' => 'A resolution note is required.',
            ]);
        }

        return $note;
    }

    /**
     * Reports awaiting action, used by the dashboard KPI block.
     */
    public function countAwaitingAction(): int
    {
        return ContentReport::query()->awaitingAction()->count();
    }
}
