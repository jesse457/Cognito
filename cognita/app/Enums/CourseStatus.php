<?php

declare(strict_types=1);

namespace App\Enums;

enum CourseStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';
    case Removed = 'removed';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** Removed courses are hidden from the student catalogue. */
    public function isVisibleToStudents(): bool
    {
        return $this === self::Published;
    }
}
