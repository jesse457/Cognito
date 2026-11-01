<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\ContentReport;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A report was resolved or dismissed. Notifies the reporter.
 */
class ReportResolved
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly ContentReport $report,
        public readonly User $actor,
    ) {}
}
