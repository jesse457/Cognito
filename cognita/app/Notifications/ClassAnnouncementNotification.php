<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Announcement;
use App\Models\PrivateClass;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Delivers a class announcement to a student over the `database` channel.
 *
 * Queued (ShouldQueue) because a class can have dozens of recipients and the
 * instructor's request must not wait on notification writes.
 */
class ClassAnnouncementNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Announcement $announcement,
        public readonly PrivateClass $privateClass,
    ) {
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
            'type' => 'class_announcement',
            'announcement_id' => (int) $this->announcement->getKey(),
            'class_id' => (int) $this->privateClass->getKey(),
            'class_name' => $this->privateClass->name,
            'title' => $this->announcement->title,
            'body' => $this->announcement->body,
            'published_at' => $this->announcement->published_at?->toIso8601String(),
        ];
    }
}
