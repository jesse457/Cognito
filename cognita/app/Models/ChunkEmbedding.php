<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Vector row for one document chunk.
 *
 * `embedding` is a pgvector column created with raw SQL, so it is deliberately
 * NOT in $fillable and never cast: writes/reads go through the helper methods
 * below, which use parameter binding (never string interpolation).
 */
class ChunkEmbedding extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'chunk_id',
    ];

    /** @return BelongsTo<DocumentChunk, $this> */
    public function chunk(): BelongsTo
    {
        return $this->belongsTo(DocumentChunk::class, 'chunk_id');
    }

    /**
     * Persist a vector for the given chunk.
     *
     * @param  list<float>  $vector
     */
    public static function store(int $chunkId, array $vector): self
    {
        $embedding = self::create(['chunk_id' => $chunkId]);

        DB::update(
            'UPDATE chunk_embeddings SET embedding = ?::vector WHERE id = ?',
            [self::toVectorLiteral($vector), $embedding->getKey()],
        );

        return $embedding;
    }

    /**
     * Cosine-similarity search across the RAG corpus, optionally scoped to a
     * course. Returns chunk rows with a `similarity` attribute.
     *
     * @param  list<float>  $vector
     * @return Collection<int, object>
     */
    public static function nearest(array $vector, int $limit = 8, ?int $courseId = null): Collection
    {
        $sql = 'SELECT c.id, c.course_id, c.source_name, c.chunk_index, c.content, c.metadata,
                       1 - (e.embedding <=> ?::vector) AS similarity
                  FROM chunk_embeddings e
                  JOIN document_chunks c ON c.id = e.chunk_id
                 WHERE e.embedding IS NOT NULL';

        $bindings = [self::toVectorLiteral($vector)];

        if ($courseId !== null) {
            $sql .= ' AND c.course_id = ?';
            $bindings[] = $courseId;
        }

        $sql .= ' ORDER BY e.embedding <=> ?::vector LIMIT ?';
        $bindings[] = self::toVectorLiteral($vector);
        $bindings[] = $limit;

        return collect(DB::select($sql, $bindings));
    }

    /** @param  list<float>  $vector */
    public static function toVectorLiteral(array $vector): string
    {
        return '['.implode(',', array_map(
            static fn (float|int $value): string => (string) (float) $value,
            $vector,
        )).']';
    }
}
