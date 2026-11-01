<?php

declare(strict_types=1);

namespace App\Enums;

enum ForumStatus: string
{
    case Open = 'open';
    case Locked = 'locked';
    case Removed = 'removed';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
