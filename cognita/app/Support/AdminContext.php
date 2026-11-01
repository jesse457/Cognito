<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;

/**
 * Request-scoped marker for "this code is running inside an admin-panel action".
 *
 * `LogsAdminActivity` consults this singleton to decide whether a model write
 * should be audited. Public / student actions never set an actor, so they are
 * never audited.
 *
 * Services that write their own, richer audit row (UserManagementService,
 * ModerationService, ReportService, SystemSettingService, StaffInvitationService,
 * ImpersonationService) wrap their transaction in `runWithoutModelAudit()` so the
 * explicit service row is the only row written — keeping the audit trail at
 * exactly one row per privileged action.
 */
final class AdminContext
{
    private ?User $actor = null;

    private bool $auditModelChanges = true;

    private ?string $ipAddress = null;

    private ?string $userAgent = null;

    public function setActor(?User $actor): void
    {
        $this->actor = $actor;
    }

    public function actor(): ?User
    {
        return $this->actor;
    }

    public function hasActor(): bool
    {
        return $this->actor !== null;
    }

    public function setRequestMeta(?string $ipAddress, ?string $userAgent): void
    {
        $this->ipAddress = $ipAddress;
        $this->userAgent = $userAgent;
    }

    public function ipAddress(): ?string
    {
        return $this->ipAddress;
    }

    public function userAgent(): ?string
    {
        return $this->userAgent;
    }

    public function auditingEnabled(): bool
    {
        return $this->hasActor() && $this->auditModelChanges;
    }

    /**
     * Run a callback with model-level auditing disabled, restoring the previous
     * flag afterwards (including on exception).
     *
     * @template TReturn
     *
     * @param  callable(): TReturn  $callback
     * @return TReturn
     */
    public function runWithoutModelAudit(callable $callback): mixed
    {
        $previous = $this->auditModelChanges;
        $this->auditModelChanges = false;

        try {
            return $callback();
        } finally {
            $this->auditModelChanges = $previous;
        }
    }

    public function flush(): void
    {
        $this->actor = null;
        $this->auditModelChanges = true;
        $this->ipAddress = null;
        $this->userAgent = null;
    }
}
