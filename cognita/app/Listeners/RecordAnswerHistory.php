<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\AnswerSubmitted;
use App\Services\KnowledgeTracingService;
use Illuminate\Support\Facades\Log;

/**
 * AnswerSubmitted → queue a knowledge-tracing update for the answered KC.
 *
 * The answer row itself is persisted by PracticeSessionService before the event
 * fires; this listener is the only place that turns an answer into KT work, so
 * the flow stays a single hop.
 */
class RecordAnswerHistory
{
    public function __construct(private readonly KnowledgeTracingService $knowledgeTracing) {}

    public function handle(AnswerSubmitted $event): void
    {
        $this->knowledgeTracing->dispatchForAnswer($event->answer);

        Log::info('answer.recorded', [
            'user_id' => $event->user->getKey(),
            'session_id' => $event->session->getKey(),
            'lesson_id' => $event->answer->lesson_id,
            'knowledge_component_id' => $event->answer->knowledge_component_id,
            'is_correct' => $event->answer->is_correct,
        ]);
    }
}
