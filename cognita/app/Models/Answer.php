<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\AnswerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * One answer to a class question. A question owner can mark one answer as
 * accepted; votes decide the rest of the order.
 */
class Answer extends Model
{
    /** @use HasFactory<AnswerFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'question_id',
        'user_id',
        'body',
        'is_accepted',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_accepted' => 'boolean',
        ];
    }

    /** @return BelongsTo<Question, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<AnswerVote, $this> */
    public function votes(): HasMany
    {
        return $this->hasMany(AnswerVote::class);
    }

    /** @return MorphMany<PostMedia, $this> */
    public function media(): MorphMany
    {
        return $this->morphMany(PostMedia::class, 'mediable');
    }
}
