<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\AnswerHistory;
use App\Models\PracticeSession;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A single answer was persisted. Listeners mirror it into knowledge tracing.
 */
class AnswerSubmitted
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly PracticeSession $session,
        public readonly AnswerHistory $answer,
    ) {}
}
