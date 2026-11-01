<?php

declare(strict_types=1);

namespace App\Http\Resources\Instructor;

use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Announcement
 */
class AnnouncementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'class_id' => (int) $this->class_id,
            'instructor_id' => (int) $this->instructor_id,
            'title' => $this->title,
            'body' => $this->body,
            'published_at' => $this->published_at?->toIso8601String(),
            'author' => $this->whenLoaded('instructor', fn (): array => [
                'id' => (int) $this->instructor->id,
                'name' => $this->instructor->displayLabel(),
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
