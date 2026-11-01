<?php

declare(strict_types=1);

namespace App\Http\Resources\Instructor;

use App\Models\ClassCourseAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ClassCourseAssignment
 */
class CourseAssignmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'class_id' => (int) $this->class_id,
            'course_id' => (int) $this->course_id,
            'assigned_by' => (int) $this->assigned_by,
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'course' => $this->whenLoaded('course', fn (): array => [
                'id' => (int) $this->course->id,
                'title' => $this->course->title,
                'status' => $this->course->status?->value ?? (string) $this->course->status,
            ]),
        ];
    }
}
