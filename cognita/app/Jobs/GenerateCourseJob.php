<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\DocumentChunk;
use App\Models\User;
use App\Services\CourseGenerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Queue wrapper around CourseGenerationService (LLM call — never synchronous).
 */
class GenerateCourseJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120, 300];

    /**
     * @param  list<int>  $chunkIds
     */
    public function __construct(
        public readonly int $actorId,
        public readonly array $chunkIds,
        public readonly string $titleHint = '',
    ) {}

    public function handle(CourseGenerationService $courses): void
    {
        $actor = User::query()->find($this->actorId);

        if ($actor === null) {
            Log::warning('rag.course_actor_missing', ['actor_id' => $this->actorId]);

            return;
        }

        $sourceMaterial = DocumentChunk::query()
            ->whereIn('id', $this->chunkIds)
            ->orderBy('chunk_index')
            ->pluck('content')
            ->all();

        if ($sourceMaterial === []) {
            Log::warning('rag.course_source_missing', ['chunk_ids' => $this->chunkIds]);

            return;
        }

        $course = $courses->generate($sourceMaterial, $actor, $this->titleHint);

        Log::info('rag.course_job_completed', [
            'course_id' => $course->getKey(),
            'actor_id' => $this->actorId,
            'chunk_ids' => $this->chunkIds,
        ]);
    }
}
