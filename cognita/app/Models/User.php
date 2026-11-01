<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Concerns\LogsAdminActivity;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, LogsAdminActivity, Notifiable;

    /** @var list<string> */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'display_name',
        'avatar_url',
        'status',
        'suspended_until',
        'last_seen_at',
    ];

    /** @var list<string> */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'suspended_until' => 'datetime',
            'last_seen_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => UserStatus::class,
        ];
    }

    // ---------------------------------------------------------------------
    // Relationships
    // ---------------------------------------------------------------------

    /** @return HasMany<Enrollment, $this> */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /** @return BelongsToMany<Course, $this> */
    public function enrolledCourses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'enrollments')->withPivot('enrolled_at')->withTimestamps();
    }

    /** @return HasMany<PracticeSession, $this> */
    public function practiceSessions(): HasMany
    {
        return $this->hasMany(PracticeSession::class);
    }

    /** @return HasMany<AnswerHistory, $this> */
    public function answerHistory(): HasMany
    {
        return $this->hasMany(AnswerHistory::class);
    }

    /** @return HasMany<StudentKcMastery, $this> */
    public function studentKcMasteries(): HasMany
    {
        return $this->hasMany(StudentKcMastery::class);
    }

    /** @return HasOne<ParticipantProfile, $this> */
    public function participantProfile(): HasOne
    {
        return $this->hasOne(ParticipantProfile::class);
    }

    /** @return HasMany<LeaderboardEntry, $this> */
    public function leaderboardEntries(): HasMany
    {
        return $this->hasMany(LeaderboardEntry::class);
    }

    /** @return BelongsToMany<Achievement, $this> */
    public function achievements(): BelongsToMany
    {
        return $this->belongsToMany(Achievement::class, 'user_achievements')
            ->withPivot('earned_at')
            ->withTimestamps();
    }

    /** @return HasMany<UserAchievement, $this> */
    public function userAchievements(): HasMany
    {
        return $this->hasMany(UserAchievement::class);
    }

    /** Courses this user instructs. @return HasMany<Course, $this> */
    public function instructedCourses(): HasMany
    {
        return $this->hasMany(Course::class, 'instructor_id');
    }

    /** Courses this user generated/created. @return HasMany<Course, $this> */
    public function createdCourses(): HasMany
    {
        return $this->hasMany(Course::class, 'created_by');
    }

    /** @return HasMany<PrivateClass, $this> */
    public function instructedPrivateClasses(): HasMany
    {
        return $this->hasMany(PrivateClass::class, 'instructor_id');
    }

    /** @return HasMany<ClassEnrollment, $this> */
    public function classEnrollments(): HasMany
    {
        return $this->hasMany(ClassEnrollment::class, 'student_id');
    }

    /** @return HasMany<StudentContentAssignment, $this> */
    public function contentAssignments(): HasMany
    {
        return $this->hasMany(StudentContentAssignment::class, 'student_id');
    }

    /** @return HasMany<InstructorNote, $this> */
    public function instructorNotesAbout(): HasMany
    {
        return $this->hasMany(InstructorNote::class, 'student_id');
    }

    /** @return HasMany<InstructorNote, $this> */
    public function instructorNotesAuthored(): HasMany
    {
        return $this->hasMany(InstructorNote::class, 'instructor_id');
    }

    /** @return HasMany<ForumThread, $this> */
    public function forumThreads(): HasMany
    {
        return $this->hasMany(ForumThread::class);
    }

    /** @return HasMany<ForumPost, $this> */
    public function forumPosts(): HasMany
    {
        return $this->hasMany(ForumPost::class);
    }

    /** Reports this user filed. @return HasMany<ContentReport, $this> */
    public function contentReports(): HasMany
    {
        return $this->hasMany(ContentReport::class, 'reporter_id');
    }

    /** Reports this user resolved/dismissed. @return HasMany<ContentReport, $this> */
    public function resolvedReports(): HasMany
    {
        return $this->hasMany(ContentReport::class, 'resolved_by');
    }

    /** @return HasMany<AdminAuditLog, $this> */
    public function adminAuditLogs(): HasMany
    {
        return $this->hasMany(AdminAuditLog::class, 'actor_id');
    }

    /** @return HasMany<ModerationAction, $this> */
    public function moderationActionsReceived(): HasMany
    {
        return $this->hasMany(ModerationAction::class, 'target_user_id');
    }

    /** @return HasMany<ModerationAction, $this> */
    public function moderationActionsGiven(): HasMany
    {
        return $this->hasMany(ModerationAction::class, 'actor_id');
    }

    /** @return HasMany<StaffInvitation, $this> */
    public function staffInvitationsSent(): HasMany
    {
        return $this->hasMany(StaffInvitation::class, 'invited_by');
    }

    /** @return HasMany<Announcement, $this> */
    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class, 'instructor_id');
    }

    /** @return HasMany<DocumentChunk, $this> */
    public function uploadedDocumentChunks(): HasMany
    {
        return $this->hasMany(DocumentChunk::class, 'uploaded_by');
    }

    // ---------------------------------------------------------------------
    // Scopes & helpers
    // ---------------------------------------------------------------------

    /** @param  Builder<User>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', UserStatus::Active->value);
    }

    /** Users whose role is at least the given rank. @param  Builder<User>  $query */
    public function scopeRoleAtLeast(Builder $query, UserRole $role): void
    {
        $query->whereIn('role', array_values(array_map(
            static fn (UserRole $candidate): string => $candidate->value,
            array_filter(
                UserRole::cases(),
                static fn (UserRole $candidate): bool => $candidate->atLeast($role),
            ),
        )));
    }

    public function roleAtLeast(UserRole $role): bool
    {
        return $this->role->atLeast($role);
    }

    public function isStaff(): bool
    {
        return $this->role->isStaff();
    }

    public function isOwner(): bool
    {
        return $this->role === UserRole::Owner;
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isModerator(): bool
    {
        return $this->role === UserRole::Moderator;
    }

    public function isInstructor(): bool
    {
        return $this->role === UserRole::Instructor;
    }

    public function isStudent(): bool
    {
        return $this->role === UserRole::Student;
    }

    public function isBanned(): bool
    {
        return $this->status === UserStatus::Banned;
    }

    public function isSuspended(): bool
    {
        return $this->status === UserStatus::Suspended;
    }

    /** A suspension that has not yet elapsed keeps the user blocked. */
    public function hasActiveSuspension(): bool
    {
        return $this->status === UserStatus::Suspended
            && ($this->suspended_until === null || $this->suspended_until->isFuture());
    }

    public function isActiveAccount(): bool
    {
        return ! $this->isBanned() && ! $this->hasActiveSuspension();
    }

    public function displayLabel(): string
    {
        return $this->display_name ?? $this->name;
    }

    /** Two-letter monogram for the console avatar. */
    public function initials(): string
    {
        $parts = preg_split('/\s+/', trim($this->displayLabel())) ?: [];
        $initials = '';

        foreach (array_slice($parts, 0, 2) as $part) {
            $initials .= mb_strtoupper(mb_substr($part, 0, 1));
        }

        return $initials !== '' ? $initials : '?';
    }

    public function auditResourceName(): string
    {
        return 'user';
    }
}
