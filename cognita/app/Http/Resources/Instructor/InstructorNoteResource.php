<?php

declare(strict_types=1);

namespace App\Http\Resources\Instructor;

use App\Models\InstructorNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Instructor-private note. This resource must never be returned on a
 * student-facing route: InstructorNote rows are a private teaching journal.
 *
 * @mixin InstructorNote
 */
class InstructorNoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'class_id' => (int) $this->class_id,
            'student_id' => (int) $this->student_id,
            'instructor_id' => (int) $this->instructor_id,
            'note' => $this->note,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
