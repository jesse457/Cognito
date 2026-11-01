<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\KnowledgeComponentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KnowledgeComponent extends Model
{
    /** @use HasFactory<KnowledgeComponentFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'course_id',
        'name',
        'description',
        'slug',
    ];

    /** @return BelongsTo<Course, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** @return BelongsToMany<Lesson, $this> */
    public function lessons(): BelongsToMany
    {
        return $this->belongsToMany(Lesson::class, 'lesson_kc_map', 'knowledge_component_id', 'lesson_id')
            ->withTimestamps();
    }

    /** @return HasMany<LessonKcMap, $this> */
    public function lessonKcMaps(): HasMany
    {
        return $this->hasMany(LessonKcMap::class);
    }

    /** @return HasMany<StudentKcMastery, $this> */
    public function studentMasteries(): HasMany
    {
        return $this->hasMany(StudentKcMastery::class);
    }

    /** @return HasMany<AnswerHistory, $this> */
    public function answerHistory(): HasMany
    {
        return $this->hasMany(AnswerHistory::class);
    }
}
