<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The life of a live class session.
 *
 * Scheduled sessions can be entered early into a waiting room. Live sessions
 * are open and record attendance. Completed sessions are behind the class and
 * can no longer be joined.
 */
enum LiveSessionStatus: string
{
    case Scheduled = 'scheduled';
    case Live = 'live';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => 'Scheduled',
            self::Live => 'Live',
            self::Completed => 'Completed',
        };
    }

    public function isLive(): bool
    {
        return $this === self::Live;
    }

    /** Values stored in the status column. */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
