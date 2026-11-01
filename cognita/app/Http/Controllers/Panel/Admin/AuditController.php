<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use App\Services\AdminScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only audit trail. Owners see every row; admins are scoped to their own
 * actions by AdminScopeService. There is no update or delete path.
 */
class AuditController extends Controller
{
    public function index(Request $request, AdminScopeService $scope): Response
    {
        Gate::authorize('viewAny', AdminAuditLog::class);

        /** @var User $actor */
        $actor = $request->user();

        $action = $request->string('action')->toString();
        $actorId = $request->integer('actor_id');

        $logs = $scope
            ->scopeAuditLogsFor($actor, AdminAuditLog::query()->with('actor:id,name,display_name'))
            ->when($action !== '', fn ($query) => $query->where('action', $action))
            ->when($actorId > 0, fn ($query) => $query->where('actor_id', $actorId))
            ->latest('created_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (AdminAuditLog $log): array => [
                'id' => $log->getKey(),
                'action' => $log->action,
                'actor' => $log->actor?->displayLabel(),
                'actor_id' => $log->actor_id,
                'actor_role' => $log->actor_role,
                'target_type' => $log->target_type,
                'target_id' => $log->target_id,
                'context' => $log->context,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/AuditLog/Index', [
            'logs' => $logs,
            'filters' => ['action' => $action, 'actor_id' => $actorId ?: null],
            'actions' => AdminAuditLog::query()
                ->select('action')
                ->distinct()
                ->orderBy('action')
                ->pluck('action')
                ->all(),
            'scope' => [
                'sees_all_rows' => $actor->isOwner(),
                'actor_id' => $actor->getKey(),
            ],
        ]);
    }
}
