<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ForumStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ForumThread extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'course_id',
        'user_id',
        'title',
        'body',
        'status',
        'removed_by',
        'removal_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ForumStatus::class,
        ];
    }

    /** @return BelongsTo<Course, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function removedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'removed_by');
    }

    /** @return HasMany<ForumPost, $this> */
    public function posts(): HasMany
    {
        return $this->hasMany(ForumPost::class, 'thread_id');
    }

    /** @return MorphMany<ContentReport, $this> */
    public function reports(): MorphMany
    {
        return $this->morphMany(ContentReport::class, 'reportable');
    }

    /** @param  Builder<ForumThread>  $query */
    public function scopeVisible(Builder $query): void
    {
        $query->where('status', '!=', ForumStatus::Removed->value);
    }

    public function isLocked(): bool
    {
        return $this->status === ForumStatus::Locked;
    }
}
