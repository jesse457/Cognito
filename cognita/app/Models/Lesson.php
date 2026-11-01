<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ContentType;
use Database\Factories\LessonFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Lesson extends Model
{
    /** @use HasFactory<LessonFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'module_id',
        'title',
        'content_type',
        'content_url',
        'content_body',
        'sequence_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'content_type' => ContentType::class,
            'sequence_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Module, $this> */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /** @return BelongsToMany<KnowledgeComponent, $this> */
    public function knowledgeComponents(): BelongsToMany
    {
        return $this->belongsToMany(KnowledgeComponent::class, 'lesson_kc_map')->withTimestamps();
    }

    /** @return HasMany<LessonKcMap, $this> */
    public function lessonKcMaps(): HasMany
    {
        return $this->hasMany(LessonKcMap::class);
    }

    /** @return MorphMany<ContentReport, $this> */
    public function reports(): MorphMany
    {
        return $this->morphMany(ContentReport::class, 'reportable');
    }

    /** @return HasMany<AnswerHistory, $this> */
    public function answerHistory(): HasMany
    {
        return $this->hasMany(AnswerHistory::class);
    }

    /** @return HasMany<PracticeSession, $this> */
    public function practiceSessions(): HasMany
    {
        return $this->hasMany(PracticeSession::class);
    }

    /** @return HasMany<StudentContentAssignment, $this> */
    public function contentAssignments(): HasMany
    {
        return $this->hasMany(StudentContentAssignment::class);
    }

    public function course(): ?Course
    {
        return $this->module?->course;
    }
}
