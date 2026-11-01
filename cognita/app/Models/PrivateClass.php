<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ClassStatus;
use Database\Factories\PrivateClassFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PrivateClass extends Model
{
    /** @use HasFactory<PrivateClassFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'instructor_id',
        'name',
        'description',
        'join_code',
        'max_students',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'max_students' => 'integer',
            'status' => ClassStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $class): void {
            $class->join_code ??= self::generateJoinCode();
        });
    }

    public static function generateJoinCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (self::query()->where('join_code', $code)->exists());

        return $code;
    }

    /** @return BelongsTo<User, $this> */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /** @return HasMany<ClassEnrollment, $this> */
    public function enrollments(): HasMany
    {
        return $this->hasMany(ClassEnrollment::class, 'class_id');
    }

    /** @return BelongsToMany<User, $this> */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'class_enrollments', 'class_id', 'student_id')
            ->withPivot(['status', 'enrolled_at'])
            ->withTimestamps();
    }

    /** @return HasMany<ClassInvitation, $this> */
    public function invitations(): HasMany
    {
        return $this->hasMany(ClassInvitation::class, 'class_id');
    }

    /** @return HasMany<ClassCourseAssignment, $this> */
    public function courseAssignments(): HasMany
    {
        return $this->hasMany(ClassCourseAssignment::class, 'class_id');
    }

    /** @return BelongsToMany<Course, $this> */
    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'class_course_assignments', 'class_id', 'course_id')
            ->withPivot(['assigned_by', 'assigned_at'])
            ->withTimestamps();
    }

    /** @return HasMany<StudentContentAssignment, $this> */
    public function contentAssignments(): HasMany
    {
        return $this->hasMany(StudentContentAssignment::class, 'class_id');
    }

    /** @return HasMany<Announcement, $this> */
    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class, 'class_id');
    }

    /** @return HasMany<InstructorNote, $this> */
    public function notes(): HasMany
    {
        return $this->hasMany(InstructorNote::class, 'class_id');
    }

    /** @return HasMany<CohortAnalyticsSnapshot, $this> */
    public function analyticsSnapshots(): HasMany
    {
        return $this->hasMany(CohortAnalyticsSnapshot::class, 'class_id');
    }

    /** @param  Builder<PrivateClass>  $query */
    public function scopeOwnedBy(Builder $query, User $user): void
    {
        $query->where('instructor_id', $user->getKey());
    }

    /** @param  Builder<PrivateClass>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', ClassStatus::Active->value);
    }

    public function isActive(): bool
    {
        return $this->status === ClassStatus::Active;
    }

    /** Active (non-removed) member count. */
    public function activeStudentCount(): int
    {
        return $this->enrollments()->where('status', 'active')->count();
    }

    public function hasCapacityFor(int $additional = 1): bool
    {
        return $this->activeStudentCount() + $additional <= $this->max_students;
    }
}
