<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\AdminContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Automatic expiry of elapsing suspensions.
 *
 * Audit rows require an actor FK. Because no human is present, the bootstrap
 * owner is recorded as the actor with `automatic: true` in the context. If no
 * owner exists the command still lifts the suspensions and logs a structured
 * warning instead of inventing an actor.
 *
 * Model-level auditing is suppressed so each user produces exactly ONE audit
 * row (`user.suspension_expired`) rather than a generic `user.update` row.
 */
class ExpireSuspensions extends Command
{
    protected $signature = 'cognita:expire-suspensions';

    protected $description = 'Lift suspensions whose suspended_until timestamp has elapsed';

    public function handle(AuditLogService $audit): int
    {
        $expired = User::query()
            ->where('status', UserStatus::Suspended->value)
            ->whereNotNull('suspended_until')
            ->where('suspended_until', '<=', now())
            ->get();

        if ($expired->isEmpty()) {
            $this->info('No suspensions to expire.');

            Log::info('moderation.suspensions_expired', [
                'event' => 'moderation.suspensions_expired',
                'expired' => 0,
                'audited' => 0,
                'automatic' => true,
            ]);

            return self::SUCCESS;
        }

        $systemActor = User::query()->where('role', UserRole::Owner->value)->orderBy('id')->first();

        if ($systemActor === null) {
            Log::warning('moderation.suspensions_expired_without_audit', [
                'event' => 'moderation.suspensions_expired_without_audit',
                'expired' => $expired->count(),
                'reason' => 'no_owner_account',
                'automatic' => true,
            ]);
        }

        $expiredCount = 0;

        foreach ($expired as $user) {
            $previousUntil = $user->suspended_until;

            DB::transaction(function () use ($user, $audit, $systemActor, $previousUntil, &$expiredCount): void {
                app(AdminContext::class)->runWithoutModelAudit(function () use ($user): void {
                    $user->forceFill([
                        'status' => UserStatus::Active,
                        'suspended_until' => null,
                    ])->save();
                });

                if ($systemActor !== null) {
                    $audit->record(
                        actor: $systemActor,
                        action: 'user.suspension_expired',
                        target: $user,
                        context: [
                            'automatic' => true,
                            'reason' => 'suspended_until elapsed',
                            'previous_status' => UserStatus::Suspended->value,
                            'new_status' => UserStatus::Active->value,
                            'suspended_until' => $previousUntil?->toIso8601String(),
                            'command' => 'cognita:expire-suspensions',
                        ],
                    );
                }

                $expiredCount++;
            });

            Log::info('moderation.suspension_expired', [
                'event' => 'moderation.suspension_expired',
                'user_id' => $user->getKey(),
                'audited' => $systemActor !== null,
                'actor' => $systemActor?->getKey(),
                'automatic' => true,
            ]);
        }

        $this->info("Expired {$expiredCount} suspension(s).");

        Log::info('moderation.suspensions_expired', [
            'event' => 'moderation.suspensions_expired',
            'expired' => $expiredCount,
            'audited' => $systemActor === null ? 0 : $expiredCount,
            'automatic' => true,
        ]);

        return self::SUCCESS;
    }
}
