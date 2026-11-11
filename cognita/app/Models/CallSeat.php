<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The one live call seat held by a signed-in account inside one class.
 *
 * The Laravel session id is the browser/device fingerprint: a reload keeps the
 * same session, while another browser signing in with the same account gets a
 * new one and is refused until this seat goes stale or the old call leaves.
 */
class CallSeat extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'user_id',
        'session_id',
        'last_seen_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
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
}
