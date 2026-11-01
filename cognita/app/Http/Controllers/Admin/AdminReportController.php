<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkResolveReportsRequest;
use App\Http\Requests\Admin\DismissReportRequest;
use App\Http\Requests\Admin\ListReportsRequest;
use App\Http\Requests\Admin\ResolveReportRequest;
use App\Models\ContentReport;
use App\Models\User;
use App\Services\AdminScopeService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The moderation report queue.
 */
final class AdminReportController extends Controller
{
    public function __construct(
        private readonly ReportService $reports,
        private readonly AdminScopeService $scope,
    ) {}

    public function index(ListReportsRequest $request): JsonResponse
    {
        $this->scope->assertCanModerateReport($this->actor($request));

        $paginator = $this->reports->listOpen($request->filters());

        $data = array_map(
            fn (ContentReport $report): array => $this->describe($report),
            $paginator->items(),
        );

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, int $report): JsonResponse
    {
        $actor = $this->actor($request);
        $this->scope->assertCanModerateReport($actor);

        $model = ContentReport::query()
            ->with(['reporter', 'resolvedBy'])
            ->findOrFail($report);

        return response()->json([
            'data' => $this->describe($model, detailed: true),
        ]);
    }

    public function resolve(ResolveReportRequest $request, int $report): JsonResponse
    {
        $actor = $this->actor($request);

        $model = ContentReport::query()->findOrFail($report);

        $resolved = $this->reports->resolve(
            actor: $actor,
            report: $model,
            resolutionNote: $request->resolutionNote(),
            action: $request->moderationAction(),
            durationDays: $request->durationDays(),
        );

        return response()->json(['data' => $this->describe($resolved->load(['reporter', 'resolvedBy']), detailed: true)]);
    }

    public function dismiss(DismissReportRequest $request, int $report): JsonResponse
    {
        $actor = $this->actor($request);

        $model = ContentReport::query()->findOrFail($report);

        $dismissed = $this->reports->dismiss($actor, $model, $request->resolutionNote());

        return response()->json([
            'data' => $this->describe($dismissed->load(['reporter', 'resolvedBy']), detailed: true),
        ]);
    }

    /**
     * Assign the report to the acting moderator (moves it to `in_review`).
     * Exposed through the resolve/dismiss flows; kept here as an explicit action
     * hook used by the show page ("Claim").
     */
    public function assign(Request $request, int $report): JsonResponse
    {
        $actor = $this->actor($request);

        $model = ContentReport::query()->findOrFail($report);

        $assigned = $this->reports->assignToSelf($actor, $model);

        return response()->json(['data' => $this->describe($assigned, detailed: true)]);
    }

    public function bulkResolve(BulkResolveReportsRequest $request): JsonResponse
    {
        $actor = $this->actor($request);

        $count = $this->reports->bulkResolve(
            $actor,
            $request->reportIds(),
            $request->resolutionNote(),
        );

        return response()->json([
            'data' => [
                'resolved_count' => $count,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function describe(ContentReport $report, bool $detailed = false): array
    {
        $payload = [
            'id' => $report->getKey(),
            'reason' => $report->reason->value,
            'reason_label' => $report->reason->label(),
            'status' => $report->status->value,
            'status_label' => $report->status->label(),
            'details' => $report->details,
            'reportable' => [
                'type' => $report->reportable_type,
                'id' => $report->reportable_id,
            ],
            'created_at' => $report->created_at?->toIso8601String(),
        ];

        if ($detailed) {
            $payload['resolution_note'] = $report->resolution_note;
            $payload['resolved_at'] = $report->resolved_at?->toIso8601String();
            $payload['resolved_by'] = $report->resolved_by;
            $payload['reporter'] = $report->reporter === null ? null : [
                'id' => $report->reporter->getKey(),
                'display_label' => $report->reporter->displayLabel(),
            ];
        }

        return $payload;
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401, 'Unauthenticated.');

        return $user;
    }
}
