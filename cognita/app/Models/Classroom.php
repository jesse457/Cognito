<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ClassroomFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

/**
 * A class is the unit students join with a key, and the unit that owns a live
 * group call plus one shared board. The key is generated once and never
 * changes unless the instructor rotates it.
 */
class Classroom extends Model
{
    /** @use HasFactory<ClassroomFactory> */
    use HasFactory;

    /** Characters that are hard to confuse when a key is read aloud. */
    private const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    private const KEY_LENGTH = 6;

    /** @var list<string> */
    protected $fillable = [
        'course_id',
        'instructor_id',
        'name',
        'join_code',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $classroom): void {
            $classroom->join_code ??= self::generateJoinCode();
        });

        static::created(function (self $classroom): void {
            $classroom->board()->create([
                'surface' => 'canvas',
                'title' => 'Canvas',
            ]);
        });
    }

    public static function generateJoinCode(): string
    {
        do {
            $code = '';

            for ($i = 0; $i < self::KEY_LENGTH; $i++) {
                $code .= self::KEY_ALPHABET[random_int(0, strlen(self::KEY_ALPHABET) - 1)];
            }
        } while (self::query()->where('join_code', $code)->exists());

        return $code;
    }

    /** Normalise whatever the student typed before the key is looked up. */
    public static function normalizeJoinCode(string $code): string
    {
        return preg_replace('/[^A-Z0-9]/', '', Str::upper($code)) ?? '';
    }

    /** @return BelongsTo<Course, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** @return BelongsTo<User, $this> */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /** @return HasMany<Enrollment, $this> */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /** @return BelongsToMany<User, $this> */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'enrollments', 'classroom_id', 'student_id')
            ->withPivot('joined_at')
            ->withTimestamps();
    }

    /** @return HasOne<ClassBoard, $this> */
    public function board(): HasOne
    {
        return $this->hasOne(ClassBoard::class);
    }

    /** @param  Builder<Classroom>  $query */
    public function scopeOwnedBy(Builder $query, User $instructor): void
    {
        $query->where('instructor_id', $instructor->getKey());
    }

    public function hasMember(User $student): bool
    {
        return $this->enrollments()->where('student_id', $student->getKey())->exists();
    }

    /** The LiveKit room name. Stable for the lifetime of the class. */
    public function roomName(): string
    {
        return sprintf('%s-%d', (string) config('services.livekit.room_prefix', 'cognita-class'), $this->getKey());
    }
}
