<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\ModerationAction as ModerationActionModel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A warn/suspend/ban/unban was applied. Notifies the target user.
 */
class ModerationActionTaken
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public readonly ModerationActionModel $action) {}
}
