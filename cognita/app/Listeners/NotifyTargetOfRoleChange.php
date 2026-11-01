<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\UserRoleChanged;
use App\Models\User;
use App\Notifications\UserRoleChangedNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Tells the affected user their role changed. Failures never reach the request.
 */
class NotifyTargetOfRoleChange
{
    public function handle(UserRoleChanged $event): void
    {
        try {
            $target = $event->target;

            if (! $target instanceof User) {
                return;
            }

            Notification::send(
                $target,
                new UserRoleChangedNotification(
                    previousRole: $event->previousRole,
                    newRole: $event->newRole,
                    actorId: (int) $event->actor->getKey(),
                ),
            );
        } catch (\Throwable $exception) {
            Log::warning('admin.role_change.notification_failed', [
                'event' => 'admin.role_change.notification_failed',
                'target_user_id' => (int) $event->target->getKey(),
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
