<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\ContentReport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Tells the reporter the outcome of the report they filed.
 * Database channel; queued after commit.
 */
class ReportResolvedNotification extends Notification implements ShouldQueue
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
        $status = $this->report->status;

        return [
            'type' => 'report_resolved',
            'report_id' => (int) $this->report->getKey(),
            'status' => $status->value,
            'reason' => $this->report->reason->value,
            'resolution_note' => $this->report->resolution_note,
            'resolved_at' => $this->report->resolved_at?->toIso8601String(),
            'message' => sprintf('Your report was reviewed and marked %s.', $status->label()),
        ];
    }
}
