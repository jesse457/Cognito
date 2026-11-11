<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A photo attached to a question or an answer.
 *
 * Files live on the private local disk and are streamed through an access
 * checked route, so a photo in a class-only question cannot be fetched by
 * guessing its URL.
 */
class PostMedia extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'name',
        'path',
        'mime',
        'size',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function mediable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return array{id: int, url: string, name: string, mime: string, size: int}
     */
    public function reference(): array
    {
        return [
            'id' => (int) $this->getKey(),
            'url' => route('questions.media.show', ['media' => $this->getKey()], absolute: false),
            'name' => $this->name,
            'mime' => $this->mime,
            'size' => (int) $this->size,
        ];
    }
}
