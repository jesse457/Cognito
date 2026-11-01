<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\ContentReport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Fan-out alert to every active staff member that a new report needs a human.
 * Database channel; queued after commit.
 */
class ContentReportedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly ContentReport $report)
    {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'content_reported',
            'report_id' => (int) $this->report->getKey(),
            'reason' => $this->report->reason->value,
            'reportable_type' => $this->report->reportable_type,
            'reportable_id' => $this->report->reportable_id,
            'created_at' => $this->report->created_at?->toIso8601String(),
            'message' => 'New content report awaiting moderation.',
        ];
    }
}
