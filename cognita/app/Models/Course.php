<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CourseStatus;
use App\Models\Concerns\LogsAdminActivity;
use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory, LogsAdminActivity;

    /** @var list<string> */
    protected $fillable = [
        'title',
        'description',
        'instructor_id',
        'created_by',
        'is_ai_generated',
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
            'is_ai_generated' => 'boolean',
            'status' => CourseStatus::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function removedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'removed_by');
    }

    /** @return HasMany<Module, $this> */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class)->orderBy('sequence_order');
    }

    /** @return HasManyThrough<Lesson, Module, $this> */
    public function lessons(): HasManyThrough
    {
        return $this->hasManyThrough(Lesson::class, Module::class);
    }

    /** @return HasMany<Enrollment, $this> */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /** @return BelongsToMany<User, $this> */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'enrollments')->withPivot('enrolled_at')->withTimestamps();
    }

    /** @return HasMany<KnowledgeComponent, $this> */
    public function knowledgeComponents(): HasMany
    {
        return $this->hasMany(KnowledgeComponent::class);
    }

    /** @return MorphMany<ContentReport, $this> */
    public function reports(): MorphMany
    {
        return $this->morphMany(ContentReport::class, 'reportable');
    }

    /** @return HasMany<LeaderboardEntry, $this> */
    public function leaderboardEntries(): HasMany
    {
        return $this->hasMany(LeaderboardEntry::class);
    }

    /** @return HasMany<DocumentChunk, $this> */
    public function documentChunks(): HasMany
    {
        return $this->hasMany(DocumentChunk::class);
    }

    /** @return HasMany<ClassCourseAssignment, $this> */
    public function classAssignments(): HasMany
    {
        return $this->hasMany(ClassCourseAssignment::class);
    }

    /** @return HasMany<ForumThread, $this> */
    public function forumThreads(): HasMany
    {
        return $this->hasMany(ForumThread::class);
    }

    /** @return HasMany<PracticeSession, $this> */
    public function practiceSessions(): HasMany
    {
        return $this->hasMany(PracticeSession::class);
    }

    /** @param  Builder<Course>  $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', CourseStatus::Published->value);
    }

    /** @param  Builder<Course>  $query */
    public function scopeOwnedBy(Builder $query, User $instructor): void
    {
        $query->where('instructor_id', $instructor->getKey());
    }

    public function isRemoved(): bool
    {
        return $this->status === CourseStatus::Removed;
    }
}
