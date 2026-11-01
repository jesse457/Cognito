<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\StaffInvitation;
use App\Notifications\StaffInvitationNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Queued delivery of the staff invitation email.
 *
 * `Notification::route('mail', ...)` is used because the invitee has no User
 * record yet: the invitation email itself is the only address available.
 */
class SendStaffInvitationEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120, 600];

    public int $timeout = 60;

    public function __construct(public readonly StaffInvitation $invitation)
    {
        $this->afterCommit();
    }

    public function handle(): void
    {
        if ($this->invitation->isAccepted()) {
            Log::info('admin.staff_invitation.skipped', [
                'event' => 'admin.staff_invitation.skipped',
                'reason' => 'already_accepted',
                'invitation_id' => (int) $this->invitation->getKey(),
            ]);

            return;
        }

        Notification::route('mail', $this->invitation->email)
            ->notify(new StaffInvitationNotification($this->invitation));

        Log::info('admin.staff_invitation.sent', [
            'event' => 'admin.staff_invitation.sent',
            'invitation_id' => (int) $this->invitation->getKey(),
            'role' => $this->invitation->role->value,
        ]);
    }
}
