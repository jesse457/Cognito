<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LiveSessionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One session of one class: the stretch of time during which people were
 * actually in the call.
 *
 * It is deliberately a time and a token, not a canvas. Everything drawn in the
 * room lives in the browsers that drew it and in the realtime channel; the row
 * exists so every browser agrees on *which* room they are in, so a new room can
 * blank the board for everybody, and so a room that goes quiet can close itself.
 *
 * A session has a life of its own:
 *
 *   - scheduled  the instructor announced it; students may enter the waiting
 *                room, but nothing is live yet and nobody is recorded,
 *   - live       the instructor opened the room; attendance and ink belong to
 *                this session until they end it,
 *   - ended      the instructor closed it, or its planned window passed without
 *                it ever opening; a student cannot rejoin an ended session.
 *
 * A live session stays live until the instructor presses End class. A lost
 * network, a closed laptop or a rejoin does not end it; the instructor can come
 * back to the same session and everyone keeps their stats.
 */
class CallSession extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'course_id',
        'lesson_id',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'status',
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
            'status' => LiveSessionStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /** @return BelongsTo<Course, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** @return BelongsTo<Lesson, $this> */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
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

    /** @return BelongsToMany<ClassDocument, $this> */
    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(ClassDocument::class, 'session_materials')
            ->withTimestamps()
            ->orderBy('class_documents.id');
    }

    public function isLive(): bool
    {
        return $this->status === LiveSessionStatus::Live && $this->ended_at === null;
    }

    public function isScheduled(): bool
    {
        return $this->status === LiveSessionStatus::Scheduled;
    }

    public function isEnded(): bool
    {
        return $this->status === LiveSessionStatus::Completed;
    }

    /**
     * Whether this session is behind us.
     *
     * A session that was ended by the instructor is behind us. So is one whose
     * planned window closed without it ever opening: nobody can rejoin a lesson
     * that never happened.
     */
    public function hasPassed(): bool
    {
        if ($this->isEnded()) {
            return true;
        }

        if (! $this->isScheduled()) {
            return false;
        }

        return $this->ends_at !== null && $this->ends_at->isPast();
    }

    /**
     * What a student sees when they look at this session.
     *
     *   live     the room is open and they can join,
     *   waiting  the instructor announced it; they wait for it to open,
     *   passed   it is over; there is nothing to rejoin.
     */
    public function state(): string
    {
        if ($this->isLive()) {
            return 'live';
        }

        if ($this->isScheduled()) {
            return $this->hasPassed() ? 'passed' : 'waiting';
        }

        return 'passed';
    }
}
