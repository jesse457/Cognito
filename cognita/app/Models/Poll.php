<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A live class poll. It belongs to one call session and one class, so it stops
 * being available when the lesson ends even if its timer has not run out.
 */
class Poll extends Model
{
    public const KIND_OPEN = 'open';

    public const KIND_CHOICE = 'choice';

    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'call_session_id',
        'created_by',
        'kind',
        'question',
        'ends_at',
        'closed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ends_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /** @return BelongsTo<CallSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(CallSession::class, 'call_session_id');
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return HasMany<PollOption, $this> */
    public function options(): HasMany
    {
        return $this->hasMany(PollOption::class)->orderBy('position')->orderBy('id');
    }

    /** @return HasMany<PollResponse, $this> */
    public function responses(): HasMany
    {
        return $this->hasMany(PollResponse::class)->orderBy('id');
    }

    public function isChoice(): bool
    {
        return $this->kind === self::KIND_CHOICE;
    }

    public function isOpen(): bool
    {
        return $this->closed_at === null && $this->ends_at->isFuture();
    }

    public function secondsRemaining(): int
    {
        return max(0, $this->ends_at->getTimestamp() - Carbon::now()->getTimestamp());
    }
}
