<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Private instructor note about a student.
 *
 * Security invariant: there is no student-facing route, resource, policy or
 * service that exposes this table. Only InstructorNotePolicy (authoring
 * instructor) and the owning instructor's admin-style drill-down can read it.
 */
class InstructorNote extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'class_id',
        'student_id',
        'instructor_id',
        'note',
    ];

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

    /** @return BelongsTo<User, $this> */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }
}
