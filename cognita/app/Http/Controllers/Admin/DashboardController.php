<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\CourseStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\ContentReport;
use App\Models\Course;
use App\Models\ModerationAction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin panel KPI overview.
 *
 * Works with every feature flag off: it only counts baseline tables (users,
 * courses, reports, moderation actions, audit rows), none of which depend on
 * the instructor or social surfaces being mounted.
 */
final class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $usersByRole = [];

        foreach (UserRole::cases() as $role) {
            $usersByRole[$role->value] = User::query()->where('role', $role->value)->count();
        }

        $since = now()->subDay();

        return response()->json([
            'data' => [
                'users_total' => User::query()->count(),
                'users_by_role' => $usersByRole,
                'users_active' => User::query()->where('status', UserStatus::Active->value)->count(),
                'users_suspended' => User::query()->where('status', UserStatus::Suspended->value)->count(),
                'users_banned' => User::query()->where('status', UserStatus::Banned->value)->count(),
                'open_reports' => ContentReport::query()->awaitingAction()->count(),
                'courses_total' => Course::query()->count(),
                'courses_removed' => Course::query()->where('status', CourseStatus::Removed->value)->count(),
                'moderation_actions_24h' => ModerationAction::query()->where('created_at', '>=', $since)->count(),
                'audit_rows_24h' => AdminAuditLog::query()->where('created_at', '>=', $since)->count(),
            ],
        ]);
    }
}
