<?php

declare(strict_types=1);

namespace App\Enums;

/** How far one student is through one lesson. */
enum LessonProgressStatus: string
{
    case NotStarted = 'not_started';
    case InProgress = 'in_progress';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::NotStarted => 'Not started',
            self::InProgress => 'In progress',
            self::Completed => 'Completed',
        };
    }

    public function isCompleted(): bool
    {
        return $this === self::Completed;
    }

    /** Values accepted by the progress endpoint. */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
