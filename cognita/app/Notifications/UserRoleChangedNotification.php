<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\UserRole;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Tells a user their role changed (e.g. a staff member was promoted, or a role
 * was revoked). Database channel; queued after commit.
 */
class UserRoleChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly UserRole $previousRole,
        public readonly UserRole $newRole,
        public readonly int $actorId,
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
            'type' => 'user_role_changed',
            'previous_role' => $this->previousRole->value,
            'new_role' => $this->newRole->value,
            'actor_id' => $this->actorId,
            'message' => sprintf('Your role changed from %s to %s.', $this->previousRole->label(), $this->newRole->label()),
        ];
    }
}
