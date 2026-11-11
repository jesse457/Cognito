<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\QuestionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * A class or community question that classmates answer and vote on, the way a
 * Stack Overflow thread works inside one room or across the whole school.
 */
class Question extends Model
{
    /** @use HasFactory<QuestionFactory> */
    use HasFactory;

    public const VISIBILITY_CLASSROOM = 'classroom';

    public const VISIBILITY_COMMUNITY = 'community';

    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'user_id',
        'visibility',
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

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
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

    public function isCommunity(): bool
    {
        return $this->visibility === self::VISIBILITY_COMMUNITY;
    }

    /** @param  Builder<Question>  $query */
    public function scopeCommunity(Builder $query): void
    {
        $query->where('visibility', self::VISIBILITY_COMMUNITY);
    }

    /** @param  Builder<Question>  $query */
    public function scopeClassroom(Builder $query): void
    {
        $query->where('visibility', self::VISIBILITY_CLASSROOM);
    }
}
