<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\ReportResolved;
use App\Models\User;
use App\Notifications\ReportResolvedNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Tells the reporter what happened to their report. Failures never reach the
 * moderator's request path.
 */
class NotifyReporterOfResolution
{
    public function handle(ReportResolved $event): void
    {
        try {
            $report = $event->report;

            $reporter = $report->reporter ?? User::query()->find($report->reporter_id);

            if (! $reporter instanceof User) {
                return;
            }

            Notification::send($reporter, new ReportResolvedNotification($report));

            Log::info('admin.report.reporter_notified', [
                'event' => 'admin.report.reporter_notified',
                'report_id' => (int) $report->getKey(),
                'reporter_id' => (int) $reporter->getKey(),
                'status' => $report->status->value,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('admin.report.notify_reporter_failed', [
                'event' => 'admin.report.notify_reporter_failed',
                'report_id' => (int) $event->report->getKey(),
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
