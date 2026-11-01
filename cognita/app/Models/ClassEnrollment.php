<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EnrollmentStatus;
use Database\Factories\ClassEnrollmentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassEnrollment extends Model
{
    /** @use HasFactory<ClassEnrollmentFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'class_id',
        'student_id',
        'status',
        'enrolled_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => EnrollmentStatus::class,
            'enrolled_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<PrivateClass, $this> */
    public function privateClass(): BelongsTo
    {
        return $this->belongsTo(PrivateClass::class, 'class_id');
    }

    /** @return BelongsTo<User, $this> */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /** @param  Builder<ClassEnrollment>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', EnrollmentStatus::Active->value);
    }
}
