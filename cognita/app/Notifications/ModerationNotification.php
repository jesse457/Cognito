<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\ModerationAction as ModerationActionEnum;
use App\Models\ModerationAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Tells a user that a moderation action was applied to their account.
 *
 * Database channel only: moderation notices must survive even when mail is
 * misconfigured. Queued and committed after the transaction so a rollback can
 * never produce a phantom notification.
 */
class ModerationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly ModerationAction $moderationAction)
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
        $action = $this->moderationAction->action;

        return [
            'type' => 'moderation_action',
            'moderation_action_id' => (int) $this->moderationAction->getKey(),
            'action' => $action->value,
            'label' => $action->label(),
            'reason' => $this->moderationAction->reason,
            'expires_at' => $this->moderationAction->expires_at?->toIso8601String(),
            'created_at' => $this->moderationAction->created_at?->toIso8601String(),
            'message' => $this->message($action),
        ];
    }

    private function message(ModerationActionEnum $action): string
    {
        return match ($action) {
            ModerationActionEnum::Warn => 'You have received a warning from the moderation team.',
            ModerationActionEnum::Suspend => 'Your account has been suspended.',
            ModerationActionEnum::Ban => 'Your account has been banned.',
            ModerationActionEnum::Unban => 'Your account ban has been lifted.',
            ModerationActionEnum::Restore => 'Your content has been restored.',
        };
    }
}
