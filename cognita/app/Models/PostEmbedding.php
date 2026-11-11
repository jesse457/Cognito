<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Pgvector\Laravel\HasNeighbors;
use Pgvector\Laravel\Vector;

/**
 * One searchable post body. Questions and answers share this table so a single
 * pgvector query can find either, then the controller groups the hits by
 * thread. The source row remains the canonical content.
 */
class PostEmbedding extends Model
{
    use HasNeighbors;

    /** @var list<string> */
    protected $fillable = [
        'embeddable_type',
        'embeddable_id',
        'content',
        'embedding',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'embedding' => Vector::class,
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function embeddable(): MorphTo
    {
        return $this->morphTo();
    }
}
