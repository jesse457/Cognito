<?php

declare(strict_types=1);

namespace App\Enums;

enum ReportStatus: string
{
    case Open = 'open';
    case InReview = 'in_review';
    case Resolved = 'resolved';
    case Dismissed = 'dismissed';

    public function label(): string
    {
        return str($this->value)->replace('_', ' ')->title()->value();
    }

    public function isClosed(): bool
    {
        return $this === self::Resolved || $this === self::Dismissed;
    }
}
