<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Support\AdminContext;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Admin "act as user" support tooling.
 *
 * A short-lived Sanctum token (15 minutes) is minted for the target with the
 * abilities `impersonate` and `impersonated_by:<actorId>`, which gives
 * downstream middleware both the permission and the original identity to return
 * to. Starting and stopping are each audited.
 */
final class ImpersonationService
{
    /** Minutes an impersonation token stays usable. */
    public const TOKEN_TTL_MINUTES = 15;

    public function __construct(
        private readonly AdminScopeService $scope,
        private readonly AuditLogService $auditLog,
        private readonly AdminContext $adminContext,
        private readonly UserPolicy $policy,
    ) {}

    /**
     * @return array{token:string, impersonated_by:int, expires_at:string, user:User}
     */
    public function start(User $actor, User $target): array
    {
        if (! $this->policy->impersonate($actor, $target)) {
            abort(403, 'You cannot impersonate this user.');
        }

        // Defence in depth: an actor must strictly outrank the target.
        $this->scope->assertCanManageUser($actor, $target);

        $expiresAt = now()->addMinutes(self::TOKEN_TTL_MINUTES);

        $plainTextToken = $target->createToken(
            'impersonation',
            ['impersonate', 'impersonated_by:'.$actor->getKey()],
            $expiresAt,
        )->plainTextToken;

        $this->auditLog->record(
            actor: $actor,
            action: 'impersonation.start',
            target: $target,
            context: [
                'impersonated_user_id' => $target->getKey(),
                'impersonated_user_role' => $target->role->value,
                'expires_at' => $expiresAt->toIso8601String(),
                'actor_role' => $actor->role->value,
            ],
        );

        return [
            'token' => $plainTextToken,
            'impersonated_by' => (int) $actor->getKey(),
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $target,
        ];
    }

    /**
     * Stop impersonating: revoke every token that carries an `impersonated_by:`
     * ability for the impersonated user, then record the stop.
     */
    public function stop(User $actor, ?User $impersonatedUser = null): void
    {
        $revoked = $this->transaction(function () use ($actor, $impersonatedUser): int {
            return $this->revokeImpersonationTokens($actor, $impersonatedUser);
        });

        $this->auditLog->record(
            actor: $actor,
            action: 'impersonation.stop',
            target: $impersonatedUser,
            context: [
                'impersonated_user_id' => $impersonatedUser?->getKey(),
                'revoked_tokens' => $revoked,
            ],
        );
    }

    /**
     * Deletes personal access tokens that carry a `impersonated_by:*` ability.
     */
    private function revokeImpersonationTokens(User $actor, ?User $impersonatedUser): int
    {
        $query = PersonalAccessToken::query();

        if ($impersonatedUser !== null) {
            $query->where('tokenable_id', $impersonatedUser->getKey())
                ->where('tokenable_type', $impersonatedUser->getMorphClass());
        }

        $deleted = 0;

        /** @var iterable<PersonalAccessToken> $tokens */
        $tokens = $query->get();

        foreach ($tokens as $token) {
            $abilities = $token->abilities ?? [];

            foreach ((array) $abilities as $ability) {
                if (is_string($ability) && str_starts_with($ability, 'impersonated_by:')) {
                    $token->delete();
                    $deleted++;

                    break;
                }
            }
        }

        return $deleted;
    }

    /** Convenience for the controller: the impersonated user id from the current token. */
    public function impersonatedById(User $actor): ?int
    {
        $token = $actor->currentAccessToken();

        if ($token === null) {
            return null;
        }

        foreach ((array) ($token->abilities ?? []) as $ability) {
            if (is_string($ability) && str_starts_with($ability, 'impersonated_by:')) {
                return (int) substr($ability, strlen('impersonated_by:'));
            }
        }

        return null;
    }

    /** True when the role can ever impersonate (admin and above). */
    public function canImpersonate(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
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
