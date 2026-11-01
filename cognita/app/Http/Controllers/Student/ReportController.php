<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Events\ContentReported;
use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StoreReportRequest;
use App\Http\Resources\Student\ReportResource;
use App\Models\ContentReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Student-facing content reporting. Always mounted, independent of the social
 * flag: moderation is a baseline requirement, so a course/lesson must stay
 * reportable even with the community surface switched off.
 */
class ReportController extends Controller
{
    /** File a report against any morph-mapped resource. */
    public function store(StoreReportRequest $request): JsonResponse
    {
        $reporter = $request->user();
        $reportableType = $request->reportableType();
        $reportableId = $request->integer('reportable_id');

        $alreadyOpen = ContentReport::query()
            ->where('reporter_id', $reporter->getKey())
            ->where('reportable_type', $reportableType)
            ->where('reportable_id', $reportableId)
            ->open()
            ->exists();

        if ($alreadyOpen) {
            throw ValidationException::withMessages([
                'reportable_id' => 'You already have an open report for this content.',
            ]);
        }

        $report = ContentReport::query()->create([
            'reporter_id' => $reporter->getKey(),
            'reportable_type' => $reportableType,
            'reportable_id' => $reportableId,
            'reason' => $request->enum('reason', ReportReason::class),
            'details' => $request->filled('details')
                ? $request->string('details')->trim()->value()
                : null,
            'status' => ReportStatus::Open,
        ]);

        ContentReported::dispatch($report);

        return (new ReportResource($report))
            ->response()
            ->setStatusCode(201);
    }
}
