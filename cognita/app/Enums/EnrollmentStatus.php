<?php

declare(strict_types=1);

namespace App\Enums;

enum EnrollmentStatus: string
{
    case Active = 'active';
    case Removed = 'removed';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
