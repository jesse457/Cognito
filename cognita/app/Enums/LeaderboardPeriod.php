<?php

declare(strict_types=1);

namespace App\Enums;

enum LeaderboardPeriod: string
{
    case Weekly = 'weekly';
    case AllTime = 'all_time';

    public function label(): string
    {
        return str($this->value)->replace('_', ' ')->title()->value();
    }
}
