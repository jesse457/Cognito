<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ChunkEmbedding;
use App\Models\DocumentChunk;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Embeddings;
use Throwable;

/**
 * Embed one document chunk and store the vector in `chunk_embeddings`.
 *
 * Queued (never in a request cycle) and retried with backoff when the AI
 * provider is unavailable.
 */
class GenerateEmbeddingsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [15, 60, 180];

    public function __construct(public readonly int $chunkId) {}

    public function handle(): void
    {
        $chunk = DocumentChunk::query()->find($this->chunkId);

        if ($chunk === null) {
            Log::warning('rag.embedding_chunk_missing', ['chunk_id' => $this->chunkId]);

            return;
        }

        try {
            $dimensions = (int) config('cognita.rag.embedding_dimensions', 1536);

            $response = Embeddings::for([$chunk->content])
                ->dimensions($dimensions)
                ->generate();

            $vector = $response->first();

            if ($vector === []) {
                throw new \RuntimeException('Embedding provider returned an empty vector.');
            }

            $existing = ChunkEmbedding::query()->where('chunk_id', $chunk->getKey())->first();

            if ($existing !== null) {
                $existing->delete();
            }

            ChunkEmbedding::store($chunk->getKey(), $vector);

            Log::info('rag.embedding_stored', [
                'chunk_id' => $chunk->getKey(),
                'course_id' => $chunk->course_id,
                'dimensions' => count($vector),
            ]);
        } catch (Throwable $exception) {
            Log::warning('rag.embedding_failed', [
                'chunk_id' => $chunk->getKey(),
                'course_id' => $chunk->course_id,
                'attempt' => $this->attempts(),
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            // Let the queue retry with backoff.
            throw $exception;
        }
    }
}
