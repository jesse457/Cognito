<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\QuizCompleted;
use App\Services\GamificationService;

/**
 * QuizCompleted → XP, streak, level, leaderboard, achievements.
 */
class AwardGamificationOnQuizCompletion
{
    public function __construct(private readonly GamificationService $gamification) {}

    public function handle(QuizCompleted $event): void
    {
        $this->gamification->awardQuizCompletion(
            $event->user,
            $event->course,
            $event->correctCount,
            $event->totalCount,
        );
    }
}
