<?php

declare(strict_types=1);

namespace App\Http\Resources\Instructor;

use App\Models\StudentContentAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StudentContentAssignment
 */
class ContentAssignmentResource extends JsonResource
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
            'lesson_id' => (int) $this->lesson_id,
            'assigned_by' => (int) $this->assigned_by,
            'due_at' => $this->due_at?->toIso8601String(),
            'lesson' => $this->whenLoaded('lesson', fn (): array => [
                'id' => (int) $this->lesson->id,
                'title' => $this->lesson->title,
                'content_type' => $this->lesson->content_type?->value ?? (string) $this->lesson->content_type,
            ]),
        ];
    }
}
