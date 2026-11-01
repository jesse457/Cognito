<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Admin;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ContentReport;
use App\Models\User;
use App\Services\AdminScopeService;
use App\Services\ReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The moderation queue. Resolution can optionally carry an account action,
 * which the service applies in the same transaction as the audit row.
 */
class ReportController extends Controller
{
    public function __construct(
        private readonly ReportService $reports,
        private readonly AdminScopeService $scope,
    ) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ContentReport::class);

        $status = $request->string('status')->toString() ?: ReportStatus::Open->value;
        $reason = $request->string('reason')->toString();

        $reports = ContentReport::query()
            ->with(['reporter:id,name,display_name', 'resolvedBy:id,name,display_name'])
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($reason !== '', fn ($query) => $query->where('reason', $reason))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (ContentReport $report): array => $this->present($report));

        $counts = [];

        foreach (ReportStatus::cases() as $case) {
            $counts[$case->value] = ContentReport::query()->where('status', $case->value)->count();
        }

        return Inertia::render('Admin/Reports/Index', [
            'reports' => $reports,
            'filters' => ['status' => $status, 'reason' => $reason],
            'statuses' => array_map(static fn (ReportStatus $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
            ], ReportStatus::cases()),
            'reasons' => array_map(static fn (ReportReason $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
            ], ReportReason::cases()),
            'counts' => $counts,
        ]);
    }

    public function show(Request $request, int $report): Response
    {
        Gate::authorize('viewAny', ContentReport::class);

        /** @var User $actor */
        $actor = $request->user();

        $model = ContentReport::query()
            ->with(['reporter:id,name,display_name,email', 'resolvedBy:id,name,display_name'])
            ->findOrFail($report);

        $reportable = $model->reportable;
        $author = $this->reports->resolveReportAuthor($model);

        return Inertia::render('Admin/Reports/Show', [
            'report' => [
                ...$this->present($model),
                'details' => $model->details,
                'resolution_note' => $model->resolution_note,
                'resolved_at' => $model->resolved_at?->toIso8601String(),
                'reporter_email' => $actor->roleAtLeast(UserRole::Admin) ? $model->reporter?->email : null,
                'reportable' => $reportable === null ? null : [
                    'type' => $model->reportable_type,
                    'id' => $model->reportable_id,
                    'label' => $this->reportableLabel($model),
                ],
                'author' => $author === null ? null : [
                    'id' => $author->getKey(),
                    'name' => $author->displayLabel(),
                    'role' => $author->role->value,
                ],
            ],
            'capabilities' => [
                'can_resolve' => Gate::forUser($actor)->allows('resolve', $model),
                'can_dismiss' => Gate::forUser($actor)->allows('dismiss', $model),
                'has_author' => $author !== null,
                'can_ban_author' => $author !== null && Gate::forUser($actor)->allows('ban', $author),
            ],
        ]);
    }

    public function assign(Request $request, int $report): RedirectResponse
    {
        Gate::authorize('viewAny', ContentReport::class);

        /** @var User $actor */
        $actor = $request->user();
        $model = ContentReport::query()->findOrFail($report);

        Gate::forUser($actor)->authorize('assignToSelf', $model);

        $this->reports->assignToSelf($actor, $model);

        return back()->with('success', 'Report assigned to you and moved to review.');
    }

    public function resolve(Request $request, int $report): RedirectResponse
    {
        Gate::authorize('viewAny', ContentReport::class);

        /** @var User $actor */
        $actor = $request->user();
        $model = ContentReport::query()->findOrFail($report);

        Gate::forUser($actor)->authorize('resolve', $model);

        $validated = $request->validate([
            'resolution_note' => ['required', 'string', 'min:3', 'max:2000'],
            'action' => ['nullable', 'string', 'in:warn,suspend,ban,unban'],
            'duration_days' => ['nullable', 'integer', 'min:1', 'max:30'],
        ]);

        $action = $validated['action'] ?? null;

        $this->reports->resolve(
            actor: $actor,
            report: $model,
            resolutionNote: $validated['resolution_note'],
            action: $action === null ? null : \App\Enums\ModerationAction::from($action),
            durationDays: isset($validated['duration_days']) ? (int) $validated['duration_days'] : null,
        );

        return redirect()
            ->route('panel.admin.reports.index')
            ->with('success', 'Report resolved and recorded in the audit trail.');
    }

    public function dismiss(Request $request, int $report): RedirectResponse
    {
        Gate::authorize('viewAny', ContentReport::class);

        /** @var User $actor */
        $actor = $request->user();
        $model = ContentReport::query()->findOrFail($report);

        Gate::forUser($actor)->authorize('dismiss', $model);

        $validated = $request->validate([
            'resolution_note' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $this->reports->dismiss($actor, $model, $validated['resolution_note']);

        return redirect()
            ->route('panel.admin.reports.index')
            ->with('success', 'Report dismissed.');
    }

    /** @return array<string, mixed> */
    private function present(ContentReport $report): array
    {
        return [
            'id' => $report->getKey(),
            'reason' => $report->reason->value,
            'reason_label' => $report->reason->label(),
            'status' => $report->status->value,
            'status_label' => $report->status->label(),
            'reportable_type' => $report->reportable_type,
            'reportable_id' => $report->reportable_id,
            'reporter' => $report->reporter?->displayLabel(),
            'resolved_by' => $report->resolvedBy?->displayLabel(),
            'created_at' => $report->created_at?->toIso8601String(),
        ];
    }

    private function reportableLabel(ContentReport $report): string
    {
        $reportable = $report->reportable;

        if ($reportable === null) {
            return ucfirst(str_replace('_', ' ', $report->reportable_type)).' #'.$report->reportable_id.' (missing)';
        }

        $title = $reportable->title ?? null;

        return $title === null
            ? ucfirst(str_replace('_', ' ', $report->reportable_type)).' #'.$report->reportable_id
            : ucfirst(str_replace('_', ' ', $report->reportable_type)).': '.$title;
    }
}
