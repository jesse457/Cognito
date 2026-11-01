<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PostStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ForumPost extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'thread_id',
        'user_id',
        'parent_post_id',
        'body',
        'status',
        'hidden_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => PostStatus::class,
        ];
    }

    /** @return BelongsTo<ForumThread, $this> */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(ForumThread::class, 'thread_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<ForumPost, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_post_id');
    }

    /** @return HasMany<ForumPost, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_post_id');
    }

    /** @return BelongsTo<User, $this> */
    public function hiddenBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hidden_by');
    }

    /** @return MorphMany<ContentReport, $this> */
    public function reports(): MorphMany
    {
        return $this->morphMany(ContentReport::class, 'reportable');
    }

    /** @param  Builder<ForumPost>  $query */
    public function scopeVisible(Builder $query): void
    {
        $query->where('status', PostStatus::Visible->value);
    }
}
