<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\QuestionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * A community post: either a general post for everyone, or a question inside a
 * learner-made group. Answers and votes work the same way in both.
 *
 * @property int|null $group_id
 * @property int $user_id
 * @property string $title
 * @property string $body
 * @property array<int, string>|null $tags
 */
class Question extends Model
{
    /** @use HasFactory<QuestionFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'group_id',
        'user_id',
        'title',
        'body',
        'tags',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tags' => 'array',
        ];
    }

    /** @return BelongsTo<Group, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Answer, $this> */
    public function answers(): HasMany
    {
        return $this->hasMany(Answer::class);
    }

    /** @return HasMany<QuestionVote, $this> */
    public function votes(): HasMany
    {
        return $this->hasMany(QuestionVote::class);
    }

    /** @return MorphMany<PostMedia, $this> */
    public function media(): MorphMany
    {
        return $this->morphMany(PostMedia::class, 'mediable');
    }

    public function isGeneral(): bool
    {
        return $this->group_id === null;
    }
}
