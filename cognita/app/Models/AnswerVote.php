<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One person's vote on an answer: up (+1), down (-1), or no row at all.
 */
class AnswerVote extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'answer_id',
        'user_id',
        'value',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'integer',
        ];
    }

    /** @return BelongsTo<Answer, $this> */
    public function answer(): BelongsTo
    {
        return $this->belongsTo(Answer::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
