<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Admin;

use App\Enums\CourseStatus;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\ContentReport;
use App\Models\Course;
use App\Models\ModerationAction;
use App\Models\User;
use App\Services\AdminScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin panel landing page: platform KPIs plus the newest moderation and audit
 * activity the viewer is allowed to see.
 */
class DashboardController extends Controller
{
    public function index(Request $request, AdminScopeService $scope): Response
    {
        Gate::authorize('viewAny', User::class);

        /** @var User $actor */
        $actor = $request->user();

        $usersByRole = [];

        foreach (UserRole::cases() as $role) {
            $usersByRole[$role->value] = User::query()->where('role', $role->value)->count();
        }

        $auditCount = $scope
            ->scopeAuditLogsFor($actor, AdminAuditLog::query())
            ->where('created_at', '>=', now()->subDay())
            ->count();

        return Inertia::render('Admin/Dashboard', [
            'kpis' => [
                'users_total' => User::query()->count(),
                'users_by_role' => $usersByRole,
                'open_reports' => ContentReport::query()->where('status', ReportStatus::Open->value)->count(),
                'courses_total' => Course::query()->count(),
                'courses_removed' => Course::query()->where('status', CourseStatus::Removed->value)->count(),
                'moderation_actions_24h' => ModerationAction::query()->where('created_at', '>=', now()->subDay())->count(),
                'audit_rows_24h' => $auditCount,
            ],
            'recentReports' => ContentReport::query()
                ->with('reporter:id,name,display_name')
                ->latest()
                ->limit(6)
                ->get()
                ->map(fn (ContentReport $report): array => [
                    'id' => $report->getKey(),
                    'reason' => $report->reason->value,
                    'status' => $report->status->value,
                    'reportable_type' => $report->reportable_type,
                    'reportable_id' => $report->reportable_id,
                    'reporter' => $report->reporter?->displayLabel(),
                    'created_at' => $report->created_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
            'recentAudit' => $scope
                ->scopeAuditLogsFor(
                    $actor,
                    AdminAuditLog::query()->with('actor:id,name,display_name'),
                )
                ->latest('created_at')
                ->limit(8)
                ->get()
                ->map(fn (AdminAuditLog $log): array => [
                    'id' => $log->getKey(),
                    'action' => $log->action,
                    'actor' => $log->actor?->displayLabel(),
                    'actor_role' => $log->actor_role,
                    'target_type' => $log->target_type,
                    'target_id' => $log->target_id,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
            'capabilities' => [
                'is_owner' => $actor->isOwner(),
                'can_view_audit' => $actor->roleAtLeast(UserRole::Admin),
                'can_manage_settings' => $actor->roleAtLeast(UserRole::Owner),
                'can_invite_staff' => $actor->roleAtLeast(UserRole::Admin),
                'sees_all_audit_rows' => $actor->isOwner(),
            ],
        ]);
    }
}
