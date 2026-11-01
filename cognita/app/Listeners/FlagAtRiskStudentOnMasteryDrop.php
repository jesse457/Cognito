<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\MasteryDropped;
use App\Services\AtRiskDetectionService;
use Illuminate\Support\Facades\Log;

/**
 * Reacts to a knowledge-tracing mastery drop by re-evaluating the student's
 * at-risk status. Discovered automatically (no provider registration needed).
 *
 * Flag-gated with a guard *before* any work: with the instructor path off this
 * listener performs zero queries.
 */
class FlagAtRiskStudentOnMasteryDrop
{
    public function __construct(private readonly AtRiskDetectionService $atRiskDetection) {}

    public function handle(MasteryDropped $event): void
    {
        if (! config('features.instructor_path')) {
            return;
        }

        try {
            $this->atRiskDetection->flagStudent($event->student);
        } catch (\Throwable $exception) {
            Log::warning('instructor.at_risk.listener_failed', [
                'event' => 'instructor.at_risk.listener_failed',
                'student_id' => (int) $event->student->getKey(),
                'knowledge_component_id' => (int) $event->knowledgeComponent->getKey(),
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
