<?php

declare(strict_types=1);

namespace App\Http\Resources\Instructor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Pass-through resource for service-shaped aggregate payloads (dashboards,
 * drill-downs, heatmaps, at-risk lists, briefings).
 *
 * The services already produce API-safe arrays, so this resource only wraps them
 * in the `{"data": ...}` envelope.
 */
class InstructorPayloadResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return is_array($this->resource) ? $this->resource : (array) $this->resource;
    }
}
