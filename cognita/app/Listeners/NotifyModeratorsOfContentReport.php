<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\UserRole;
use App\Events\ContentReported;
use App\Models\User;
use App\Notifications\ContentReportedNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Notifies every active moderator-and-above when new content is reported.
 *
 * Resilient by construction: any failure is logged and swallowed, because the
 * reporter's request must never fail on a notification error.
 */
class NotifyModeratorsOfContentReport
{
    public function handle(ContentReported $event): void
    {
        try {
            $moderators = User::query()
                ->roleAtLeast(UserRole::Moderator)
                ->active()
                ->get();

            if ($moderators->isEmpty()) {
                return;
            }

            Notification::send($moderators, new ContentReportedNotification($event->report));

            Log::info('admin.report.notified_moderators', [
                'event' => 'admin.report.notified_moderators',
                'report_id' => (int) $event->report->getKey(),
                'recipients' => $moderators->count(),
            ]);
        } catch (\Throwable $exception) {
            Log::warning('admin.report.notify_moderators_failed', [
                'event' => 'admin.report.notify_moderators_failed',
                'report_id' => (int) $event->report->getKey(),
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
