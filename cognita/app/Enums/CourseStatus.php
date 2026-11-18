<?php

declare(strict_types=1);

namespace App\Enums;

/** The publishing state of a course. */
enum CourseStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Published => 'Published',
            self::Archived => 'Archived',
        };
    }

    public function isVisibleToStudents(): bool
    {
        return $this === self::Published;
    }

    /** Values accepted by course forms. */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
