<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One room of one class: the stretch of time during which people were actually
 * in the call.
 *
 * It is deliberately a time and a token, not a canvas. Everything drawn in the
 * room lives in the browsers that drew it and in the realtime channel; the row
 * exists so every browser agrees on *which* room they are in, so a new room can
 * blank the board for everybody, and so a room that goes quiet can close itself.
 *
 * A session opens when the instructor joins and stays live until they press
 * End class. A lost network, a closed laptop or a rejoin does not end it; the
 * instructor can come back to the same session and everyone keeps their stats.
 */
class CallSession extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'token',
        'opened_by',
        'last_seen_at',
        'ended_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /** @return BelongsTo<User, $this> */
    public function opener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    /** @return HasMany<Poll, $this> */
    public function polls(): HasMany
    {
        return $this->hasMany(Poll::class);
    }

    public function isLive(): bool
    {
        return $this->ended_at === null;
    }
}
