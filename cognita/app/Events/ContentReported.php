<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\ContentReport;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * New content report filed. Notifies every active moderator.
 */
class ContentReported
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public readonly ContentReport $report) {}
}
