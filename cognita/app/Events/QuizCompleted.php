<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Course;
use App\Models\PracticeSession;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A practice/quiz session was completed. Drives gamification + adaptive content.
 */
class QuizCompleted
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly PracticeSession $session,
        public readonly ?Course $course,
        public readonly int $correctCount,
        public readonly int $totalCount,
    ) {}
}
