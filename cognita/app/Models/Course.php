<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CourseStatus;
use App\Enums\Currency;
use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Number;

/**
 * A course is a lightweight container: a title, a short description and the
 * instructor who owns it. Classes (and their live group calls) hang off it.
 *
 * A course is free unless its instructor makes it paid. A paid course still
 * accepts the class key, but the live call is locked until the student's
 * enrolment is confirmed paid.
 */
class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'title',
        'description',
        'status',
        'instructor_id',
        'is_paid',
        'price_cents',
        'currency',
        'payment_url',
        'payment_instructions',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => CourseStatus::class,
            'currency' => Currency::class,
            'is_paid' => 'boolean',
            'price_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /** @return HasMany<Classroom, $this> */
    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class);
    }

    /** The ordered modules of this course. @return HasMany<Section, $this> */
    public function sections(): HasMany
    {
        return $this->hasMany(Section::class)->orderBy('position')->orderBy('id');
    }

    /** Every lesson in the course, in curriculum order. @return HasManyThrough<Lesson, Section, $this> */
    public function lessons(): HasManyThrough
    {
        return $this->hasManyThrough(Lesson::class, Section::class)->orderBy('lessons.position');
    }

    /** Files attached to the course or its lessons. @return HasMany<CourseMaterial, $this> */
    public function materials(): HasMany
    {
        return $this->hasMany(CourseMaterial::class);
    }

    public function isPublished(): bool
    {
        return $this->status === CourseStatus::Published;
    }

    /** Whether this course gates its live rooms behind a payment. */
    public function requiresPayment(): bool
    {
        return $this->is_paid;
    }

    /** The price in the course's own currency, already formatted for display. */
    public function priceLabel(): string
    {
        return Number::currency($this->price_cents / 100, $this->currency?->value ?? Currency::USD->value);
    }

    /** What a student must pay before the live room opens. */
    public function price(): float
    {
        return $this->price_cents / 100;
    }
}
