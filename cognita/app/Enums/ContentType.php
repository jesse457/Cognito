<?php

declare(strict_types=1);

namespace App\Enums;

enum ContentType: string
{
    case Text = 'text';
    case Video = 'video';
    case Quiz = 'quiz';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
