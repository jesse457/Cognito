<?php

declare(strict_types=1);

namespace App\Enums;

enum ReportReason: string
{
    case Spam = 'spam';
    case Abuse = 'abuse';
    case Misinformation = 'misinformation';
    case OffTopic = 'off_topic';
    case Other = 'other';

    public function label(): string
    {
        return str($this->value)->replace('_', ' ')->title()->value();
    }
}
