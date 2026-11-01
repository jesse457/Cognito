<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Jobs\SendStaffInvitationEmail;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Policies\StaffInvitationPolicy;
use App\Support\AdminContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Staff invitations: an admin/owner invites an email at a role they are allowed
 * to grant, the invitee accepts the emailed token without an account.
 */
final class StaffInvitationService
{
    /** Days an invitation stays usable. */
    public const TTL_DAYS = 7;

    public function __construct(
        private readonly AdminScopeService $scope,
        private readonly AuditLogService $auditLog,
        private readonly AdminContext $adminContext,
        private readonly StaffInvitationPolicy $policy,
    ) {}

    public function invite(User $actor, string $email, UserRole $role): StaffInvitation
    {
        if (! $this->policy->create($actor, $role)) {
            abort(403, 'You cannot invite a staff member at that role.');
        }

        $email = trim($email);

        $invitation = $this->transaction(function () use ($actor, $email, $role): StaffInvitation {
            $invitation = StaffInvitation::create([
                'email' => $email,
                'role' => $role->value,
                'invited_by' => $actor->getKey(),
                'expires_at' => now()->addDays(self::TTL_DAYS),
            ]);

            $this->auditLog->record(
                actor: $actor,
                action: 'staff.invite',
                target: null,
                context: [
                    'invitation_id' => $invitation->getKey(),
                    'email' => $email,
                    'role' => $role->value,
                    'expires_at' => $invitation->expires_at?->toIso8601String(),
                ],
            );

            return $invitation;
        });

        SendStaffInvitationEmail::dispatch($invitation);

        return $invitation;
    }

    /**
     * Accept an invitation. Deliberately has NO authenticated actor: the invitee
     * has no account yet, so the INVITER is recorded as the audit actor.
     */
    public function accept(string $token, string $name, string $password): User
    {
        $invitation = StaffInvitation::query()->where('token', $token)->first();

        if ($invitation === null) {
            throw ValidationException::withMessages([
                'token' => 'This invitation is not valid.',
            ]);
        }

        if ($invitation->isAccepted()) {
            throw ValidationException::withMessages([
                'token' => 'This invitation has already been used.',
            ]);
        }

        if ($invitation->isExpired()) {
            throw ValidationException::withMessages([
                'token' => 'This invitation has expired.',
            ]);
        }

        $existing = User::query()->where('email', $invitation->email)->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'email' => 'An account with this email address already exists.',
            ]);
        }

        $inviter = User::query()->find($invitation->invited_by);

        return $this->transaction(function () use ($invitation, $name, $password, $inviter): User {
            $user = User::create([
                'name' => $name,
                'email' => $invitation->email,
                'password' => Hash::make($password),
                'role' => $invitation->role->value,
                'status' => UserStatus::Active->value,
                'email_verified_at' => now(),
            ]);

            $invitation->forceFill(['accepted_at' => now()])->save();

            if ($inviter !== null) {
                $this->auditLog->record(
                    actor: $inviter,
                    action: 'staff.invite_accept',
                    target: $user,
                    context: [
                        'invitation_id' => $invitation->getKey(),
                        'email' => $user->email,
                        'granted_role' => $invitation->role->value,
                        'inviter_role' => $inviter->role->value,
                    ],
                );
            }

            return $user->refresh();
        });
    }

    public function revoke(User $actor, StaffInvitation $invitation): void
    {
        $this->scope->assertCanViewAuditLogs($actor);

        $this->transaction(function () use ($actor, $invitation): void {
            $this->auditLog->record(
                actor: $actor,
                action: 'staff.invite_revoke',
                target: null,
                context: [
                    'invitation_id' => $invitation->getKey(),
                    'email' => $invitation->email,
                    'role' => $invitation->role->value,
                    'was_accepted' => $invitation->isAccepted(),
                ],
            );

            $invitation->delete();
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
}
