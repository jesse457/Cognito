<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\ContentReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Confirmation payload for a freshly filed report.
 *
 * @mixin ContentReport
 */
class ReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $report = $this->resource;

        return [
            'id' => $report->id,
            'reportable_type' => $report->reportable_type,
            'reportable_id' => $report->reportable_id,
            'reason' => $report->reason->value,
            'details' => $report->details,
            'status' => $report->status->value,
            'created_at' => $report->created_at?->toIso8601String(),
        ];
    }
}
