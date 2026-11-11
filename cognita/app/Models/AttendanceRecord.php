<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One student's attendance inside one instructor call session.
 *
 * A student who leaves and rejoins the same class session keeps this row: the
 * completed stretches are added to present_seconds and the first join time stays
 * put. A deliberate End class starts a new call session, so the next join gets a
 * new row.
 */
class AttendanceRecord extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'call_session_id',
        'user_id',
        'attended_on',
        'joined_at',
        'last_seen_at',
        'left_at',
        'present_seconds',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attended_on' => 'date',
            'joined_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'left_at' => 'datetime',
            'present_seconds' => 'integer',
        ];
    }

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /** @return BelongsTo<CallSession, $this> */
    public function callSession(): BelongsTo
    {
        return $this->belongsTo(CallSession::class);
    }

    /** @return BelongsTo<User, $this> */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function seconds(): int
    {
        // Rows created before call-session tracking have no session id and no
        // accumulated total; keep reading them the old way.
        if ($this->call_session_id === null) {
            $end = $this->left_at ?? $this->last_seen_at;

            return max(0, $end->getTimestamp() - $this->joined_at->getTimestamp());
        }

        return max(0, (int) $this->present_seconds);
    }
}
