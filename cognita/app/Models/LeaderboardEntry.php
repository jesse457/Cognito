<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LeaderboardPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaderboardEntry extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'course_id',
        'user_id',
        'score',
        'rank',
        'period',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'rank' => 'integer',
            'period' => LeaderboardPeriod::class,
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

    /** @param  Builder<LeaderboardEntry>  $query */
    public function scopeForPeriod(Builder $query, LeaderboardPeriod $period): void
    {
        $query->where('period', $period->value);
    }
}
