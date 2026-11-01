<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\QuizCompleted;
use App\Services\AdaptiveContentService;

/**
 * QuizCompleted → compute the targeted remediation the student should see next.
 *
 * Runs after the gamification listener (both are auto-discovered from
 * app/Listeners in class-name order).
 */
class TriggerAdaptiveRemediationOnQuizCompletion
{
    public function __construct(private readonly AdaptiveContentService $adaptiveContent) {}

    public function handle(QuizCompleted $event): void
    {
        $this->adaptiveContent->rehabilitateAfterQuiz($event->user, $event->course?->getKey());
    }
}
