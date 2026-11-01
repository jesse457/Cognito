<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\KtEngine;
use App\Jobs\UpdateStudentMastery;
use App\Models\AnswerHistory;
use App\Models\Course;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Entry point for knowledge tracing.
 *
 * Nothing here calls an LLM or the KT service synchronously: work is always
 * handed to the queued UpdateStudentMastery job so a student never waits on it.
 * The engine is read from config only, and because `student_kc_mastery.model_used`
 * is a string column, switching engines needs no schema or code change.
 */
class KnowledgeTracingService
{
    public function engine(): KtEngine
    {
        return KtEngine::fromConfig(config('features.kt_engine'));
    }

    /**
     * Queue a mastery recomputation for a set of knowledge components.
     *
     * @param  list<int>  $knowledgeComponentIds
     */
    public function dispatchAssessment(User $user, array $knowledgeComponentIds = [], ?int $courseId = null): void
    {
        UpdateStudentMastery::dispatch($user->getKey(), array_values(array_unique($knowledgeComponentIds)), $courseId);
    }

    /** Called when an answer is persisted. */
    public function dispatchForAnswer(AnswerHistory $answer): void
    {
        $componentId = $answer->knowledge_component_id;

        if ($componentId === null) {
            Log::info('kt.skipped_no_knowledge_component', [
                'user_id' => $answer->user_id,
                'answer_id' => $answer->getKey(),
                'lesson_id' => $answer->lesson_id,
            ]);

            return;
        }

        $courseId = $answer->session?->course_id;

        $this->dispatchAssessment($answer->user, [$componentId], $courseId);
    }

    /** Recompute every knowledge component a user has answered for a course. */
    public function dispatchForUser(User $user, Course $course): void
    {
        $componentIds = AnswerHistory::query()
            ->where('user_id', $user->getKey())
            ->whereNotNull('knowledge_component_id')
            ->whereHas('session', fn ($query) => $query->where('course_id', $course->getKey()))
            ->pluck('knowledge_component_id')
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        if ($componentIds === []) {
            return;
        }

        $this->dispatchAssessment($user, $componentIds, $course->getKey());
    }
}
