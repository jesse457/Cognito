<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\ModerationActionTaken;
use App\Jobs\SendModerationNotification;
use Illuminate\Support\Facades\Log;

/**
 * Queues a moderation notice to the affected user.
 *
 * The listener only enqueues a job: the user's request never waits on
 * notification writes, and failures are logged rather than thrown.
 */
class NotifyTargetOfModerationAction
{
    public function handle(ModerationActionTaken $event): void
    {
        try {
            $targetId = $event->action->target_user_id;

            if ($targetId === null) {
                return;
            }

            SendModerationNotification::dispatch($event->action);

            Log::info('admin.moderation.notification_queued', [
                'event' => 'admin.moderation.notification_queued',
                'moderation_action_id' => (int) $event->action->getKey(),
                'target_user_id' => (int) $targetId,
                'action' => $event->action->action->value,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('admin.moderation.notification_failed', [
                'event' => 'admin.moderation.notification_failed',
                'moderation_action_id' => (int) $event->action->getKey(),
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
