<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LessonProgressStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One student's progress through one lesson. */
class LessonProgress extends Model
{
    protected $table = 'lesson_progress';

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'lesson_id',
        'status',
        'watched_seconds',
        'last_viewed_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => LessonProgressStatus::class,
            'watched_seconds' => 'integer',
            'last_viewed_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Lesson, $this> */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function isCompleted(): bool
    {
        return $this->status === LessonProgressStatus::Completed;
    }
}
