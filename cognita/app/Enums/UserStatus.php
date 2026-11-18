<?php

declare(strict_types=1);

namespace App\Enums;

/** Whether an account may sign in and use Cognita. */
enum UserStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Suspended => 'Suspended',
        };
    }

    public function allowsSignIn(): bool
    {
        return $this === self::Active;
    }

    /** Values accepted by account administration. */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
