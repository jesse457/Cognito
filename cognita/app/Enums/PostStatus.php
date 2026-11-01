<?php

declare(strict_types=1);

namespace App\Enums;

enum PostStatus: string
{
    case Visible = 'visible';
    case Hidden = 'hidden';
    case Removed = 'removed';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
