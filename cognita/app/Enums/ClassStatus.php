<?php

declare(strict_types=1);

namespace App\Enums;

enum ClassStatus: string
{
    case Active = 'active';
    case Archived = 'archived';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
