<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ModerationAction as ModerationActionEnum;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Events\ModerationActionTaken;
use App\Events\UserRoleChanged;
use App\Models\ModerationAction;
use App\Models\User;
use App\Support\AdminContext;
use DateTimeInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * All account-level moderation (warn / suspend / ban / unban) and role changes.
 *
 * Every mutation writes at most one `moderation_actions` row and exactly ONE
 * `admin_audit_logs` row, both inside the same DB transaction. Model-level
 * auditing is suppressed through AdminContext::runWithoutModelAudit() so the
 * LogsAdminActivity trait never adds a second row. Events are dispatched only
 * AFTER the transaction commits.
 *
 * This is the ONLY class allowed to write `users.role`.
 */
final class UserManagementService
{
    /** Suspensions longer than this are rejected: permanent removal is a ban. */
    public const MAX_SUSPENSION_DAYS = 30;

    public function __construct(
        private readonly AdminScopeService $scope,
        private readonly AuditLogService $auditLog,
        private readonly AdminContext $adminContext,
    ) {}

    public function warn(User $actor, User $target, string $reason): ModerationAction
    {
        $this->scope->assertCanModerateUser($actor, $target);

        return $this->applyAction(
            actor: $actor,
            target: $target,
            action: ModerationActionEnum::Warn,
            reason: $this->requireReason($reason),
        );
    }

    /**
     * Temporarily block an account for at most 30 days.
     */
    public function suspend(User $actor, User $target, string $reason, int $days): ModerationAction
    {
        $this->scope->assertCanModerateUser($actor, $target);

        $reason = $this->requireReason($reason);

        if ($days < 1 || $days > self::MAX_SUSPENSION_DAYS) {
            throw ValidationException::withMessages([
                'days' => sprintf(
                    'A suspension must last between 1 and %d days: the 30-day cap exists, use a ban for permanent removal.',
                    self::MAX_SUSPENSION_DAYS,
                ),
            ]);
        }

        return $this->applyAction(
            actor: $actor,
            target: $target,
            action: ModerationActionEnum::Suspend,
            reason: $reason,
            expiresAt: now()->addDays($days),
            extraContext: ['days' => $days],
        );
    }

    public function ban(User $actor, User $target, string $reason): ModerationAction
    {
        $this->scope->assertCanManageAccountState($actor, $target);

        return $this->applyAction(
            actor: $actor,
            target: $target,
            action: ModerationActionEnum::Ban,
            reason: $this->requireReason($reason),
        );
    }

    public function unban(User $actor, User $target, string $reason = 'manual unban'): ModerationAction
    {
        $this->scope->assertCanManageAccountState($actor, $target);

        return $this->applyAction(
            actor: $actor,
            target: $target,
            action: ModerationActionEnum::Unban,
            reason: $this->requireReason($reason),
            reactivate: true,
        );
    }

    /**
     * The only writer of `users.role`.
     */
    public function changeRole(User $actor, User $target, UserRole $newRole, string $reason): User
    {
        $this->scope->assertCanChangeRole($actor, $target, $newRole);

        $reason = $this->requireReason($reason);

        $previousRole = $target->role;

        $target = $this->transaction(function () use ($actor, $target, $newRole, $reason, $previousRole): User {
            $target->role = $newRole;
            $target->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'user.role_change',
                target: $target,
                context: [
                    'reason' => $reason,
                    'previous_role' => $previousRole->value,
                    'new_role' => $newRole->value,
                    'target_label' => $target->displayLabel(),
                ],
            );

            return $target->refresh();
        });

        UserRoleChanged::dispatch($target, $previousRole, $newRole, $actor);

        return $target;
    }

    /**
     * Applies the account state change, writes the `moderation_actions` row and
     * exactly one audit row — all in one transaction — then dispatches the
     * event after commit.
     *
     * @param  array<string, mixed>  $extraContext
     */
    private function applyAction(
        User $actor,
        User $target,
        ModerationActionEnum $action,
        string $reason,
        ?DateTimeInterface $expiresAt = null,
        bool $reactivate = false,
        array $extraContext = [],
    ): ModerationAction {
        $previousStatus = $target->status;

        [$moderationAction, $target] = $this->transaction(function () use (
            $actor,
            $target,
            $action,
            $reason,
            $expiresAt,
            $reactivate,
            $extraContext,
            $previousStatus,
        ): array {
            match ($action) {
                ModerationActionEnum::Suspend => $target->forceFill([
                    'status' => UserStatus::Suspended,
                    'suspended_until' => $expiresAt,
                ])->save(),
                ModerationActionEnum::Ban => $target->forceFill([
                    'status' => UserStatus::Banned,
                    'suspended_until' => null,
                ])->save(),
                ModerationActionEnum::Unban, ModerationActionEnum::Restore => $reactivate
                    ? $target->forceFill([
                        'status' => UserStatus::Active,
                        'suspended_until' => null,
                    ])->save()
                    : null,
                // A warning deliberately never touches account status.
                ModerationActionEnum::Warn => null,
            };

            $moderationAction = ModerationAction::create([
                'target_user_id' => $target->getKey(),
                'actor_id' => $actor->getKey(),
                'action' => $action->value,
                'reason' => $reason,
                'expires_at' => $expiresAt,
                'created_at' => now(),
            ]);

            $this->auditLog->record(
                actor: $actor,
                action: $action->auditAction(),
                target: $target,
                context: [
                    'reason' => $reason,
                    'moderation_action_id' => $moderationAction->getKey(),
                    'previous_status' => $previousStatus->value,
                    'new_status' => $target->status->value,
                    'suspended_until' => $expiresAt === null ? null : Carbon::instance($expiresAt)->toIso8601String(),
                    'target_label' => $target->displayLabel(),
                ] + $extraContext,
            );

            return [$moderationAction, $target->refresh()];
        });

        $moderationAction->setRelation('targetUser', $target);

        ModerationActionTaken::dispatch($moderationAction);

        return $moderationAction;
    }

    /**
     * Wraps work in runWithoutModelAudit() + a DB transaction so the explicit
     * service audit row is the only row written for this action.
     *
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
                'reason' => 'A reason is required for every moderation action.',
            ]);
        }

        return $reason;
    }
}
