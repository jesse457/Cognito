<?php

declare(strict_types=1);

namespace App\Enums;

/** The two kinds of live poll. */
enum PollKind: string
{
    case Open = 'open';
    case Choice = 'choice';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Open answer',
            self::Choice => 'Multiple choice',
        };
    }

    public function isChoice(): bool
    {
        return $this === self::Choice;
    }

    /** Values accepted by the poll form. */
    public static function values(): array
    {
        return array_map(static fn (self $kind): string => $kind->value, self::cases());
    }
}
