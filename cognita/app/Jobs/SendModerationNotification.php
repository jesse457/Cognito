<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ModerationAction;
use App\Models\User;
use App\Notifications\ModerationNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Queued delivery of a moderation notice to the affected user.
 *
 * Kept separate from the listener so the request path only enqueues one small
 * job even when a report resolution fans out to several recipients.
 */
class SendModerationNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60, 300];

    public int $timeout = 30;

    public function __construct(public readonly ModerationAction $moderationAction)
    {
        $this->afterCommit();
    }

    public function handle(): void
    {
        $target = $this->moderationAction->targetUser
            ?? User::query()->find($this->moderationAction->target_user_id);

        if (! $target instanceof User) {
            Log::warning('admin.notification.target_missing', [
                'event' => 'admin.notification.target_missing',
                'moderation_action_id' => (int) $this->moderationAction->getKey(),
                'target_user_id' => (int) $this->moderationAction->target_user_id,
            ]);

            return;
        }

        Notification::send($target, new ModerationNotification($this->moderationAction));

        Log::info('admin.notification.sent', [
            'event' => 'admin.notification.sent',
            'channel' => 'database',
            'notification' => ModerationNotification::class,
            'user_id' => (int) $target->getKey(),
            'moderation_action_id' => (int) $this->moderationAction->getKey(),
        ]);
    }
}
