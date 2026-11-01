<?php

declare(strict_types=1);

namespace App\Http\Resources\Instructor;

use App\Models\PrivateClass;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PrivateClass
 */
class InstructorClassResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'join_code' => $this->join_code,
            'status' => $this->status?->value ?? (string) $this->status,
            'max_students' => (int) $this->max_students,
            'active_students' => $this->getAttribute('active_students_count') !== null
                ? (int) $this->getAttribute('active_students_count')
                : $this->activeStudentCount(),
            'instructor' => $this->whenLoaded('instructor', fn (): array => [
                'id' => (int) $this->instructor->id,
                'name' => $this->instructor->displayLabel(),
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
