<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\StaffInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Staff invitation email containing the signed acceptance URL.
 *
 * Mail channel; queued because SMTP latency must never block an admin request.
 * The acceptance route is public (see routes/api.php) since the invitee has no
 * account yet.
 */
class StaffInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly StaffInvitation $invitation)
    {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = route('admin.staff.invitations.accept', ['token' => $this->invitation->token]);

        return (new MailMessage)
            ->subject('You are invited to the Cognita staff team')
            ->greeting('Hello,')
            ->line(sprintf(
                'You have been invited to join Cognita as a %s.',
                $this->invitation->role->label(),
            ))
            ->action('Accept invitation', $url)
            ->line(sprintf(
                'This invitation expires on %s.',
                $this->invitation->expires_at?->toDayDateTimeString() ?? 'unknown date',
            ))
            ->line('If you were not expecting this invitation you can safely ignore this email.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'staff_invitation',
            'invitation_id' => (int) $this->invitation->getKey(),
            'email' => $this->invitation->email,
            'role' => $this->invitation->role->value,
            'expires_at' => $this->invitation->expires_at?->toIso8601String(),
        ];
    }
}
