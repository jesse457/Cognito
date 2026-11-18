<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LessonStatus;
use App\Enums\LessonType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

/** One self-paced lesson inside a section. */
class Lesson extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'section_id',
        'title',
        'type',
        'status',
        'content',
        'video_url',
        'duration_minutes',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'type' => LessonType::class,
            'status' => LessonStatus::class,
            'duration_minutes' => 'integer',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<Section, $this> */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    /** @return HasOneThrough<Course, Section, $this> */
    public function course(): HasOneThrough
    {
        return $this->hasOneThrough(
            Course::class,
            Section::class,
            'id',
            'id',
            'section_id',
            'course_id',
        );
    }

    /** @return HasMany<LessonProgress, $this> */
    public function progress(): HasMany
    {
        return $this->hasMany(LessonProgress::class);
    }

    /** @return HasMany<CourseMaterial, $this> */
    public function materials(): HasMany
    {
        return $this->hasMany(CourseMaterial::class);
    }

    /** @param  Builder<Lesson>  $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', LessonStatus::Published);
    }

    public function isPublished(): bool
    {
        return $this->status === LessonStatus::Published;
    }
}
