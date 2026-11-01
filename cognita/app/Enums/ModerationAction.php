<?php

declare(strict_types=1);

namespace App\Enums;

enum ModerationAction: string
{
    case Warn = 'warn';
    case Suspend = 'suspend';
    case Ban = 'ban';
    case Unban = 'unban';
    case Restore = 'restore';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** Audit action keys written to `admin_audit_logs.action`. */
    public function auditAction(): string
    {
        return match ($this) {
            self::Warn => 'user.warn',
            self::Suspend => 'user.suspend',
            self::Ban => 'user.ban',
            self::Unban => 'user.unban',
            self::Restore => 'user.restore',
        };
    }
}
