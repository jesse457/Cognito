<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Course
 */
class CourseResource extends JsonResource
{
    public function __construct(Course $course, private readonly bool $enrolled = false)
    {
        parent::__construct($course);
    }

    public function withCurriculum(): static
    {
        $this->curriculum = true;

        return $this;
    }

    private bool $curriculum = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $payload = [
            'id' => $this->getKey(),
            'title' => $this->title,
            'description' => $this->description,
            'is_ai_generated' => $this->is_ai_generated,
            'status' => $this->status?->value,
            'enrolled' => $this->enrolled,
            'instructor' => $this->whenLoaded('instructor', fn () => [
                'id' => $this->instructor?->getKey(),
                'name' => $this->instructor?->displayLabel(),
            ]),
            'modules_count' => $this->whenCounted('modules'),
            'lessons_count' => $this->whenCounted('lessons'),
            'enrollments_count' => $this->whenCounted('enrollments'),
        ];

        if ($this->curriculum) {
            $payload['knowledge_components'] = $this->knowledgeComponents->map(fn ($component): array => [
                'id' => $component->getKey(),
                'name' => $component->name,
                'slug' => $component->slug,
            ])->values()->all();

            $payload['modules'] = $this->modules->map(fn ($module): array => [
                'id' => $module->getKey(),
                'title' => $module->title,
                'sequence_order' => $module->sequence_order,
                'lessons' => $module->lessons->map(fn ($lesson): array => [
                    'id' => $lesson->getKey(),
                    'title' => $lesson->title,
                    'content_type' => $lesson->content_type?->value,
                    'sequence_order' => $lesson->sequence_order,
                ])->values()->all(),
            ])->values()->all();
        }

        return $payload;
    }
}
