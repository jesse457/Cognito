<?php

declare(strict_types=1);

namespace App\Enums;

/** Whether students can see and open a lesson. */
enum LessonStatus: string
{
    case Draft = 'draft';
    case Published = 'published';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Published => 'Published',
        };
    }

    public function isVisibleToStudents(): bool
    {
        return $this === self::Published;
    }

    /** Values accepted by lesson forms. */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
