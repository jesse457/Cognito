<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use App\Services\AdminScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Append-only audit trail reader.
 *
 * Row-level visibility (owners: everything, admins: only their own actions) is
 * applied exclusively by AdminScopeService::scopeAuditLogsFor().
 */
final class AuditLogController extends Controller
{
    public function __construct(private readonly AdminScopeService $scope) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $this->actor($request);

        $this->scope->assertCanViewAuditLogs($actor);

        $validated = $request->validate([
            'action' => ['sometimes', 'nullable', 'string', 'max:120'],
            'actor_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'target_type' => ['sometimes', 'nullable', 'string', Rule::in([
                'user', 'course', 'forum_thread', 'forum_post', 'content_report',
            ])],
            'per_page' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        $query = AdminAuditLog::query()->with('actor');

        $query = $this->scope->scopeAuditLogsFor($actor, $query);

        if (isset($validated['action']) && is_string($validated['action']) && $validated['action'] !== '') {
            $query->where('action', 'like', $validated['action'].'%');
        }

        if (isset($validated['actor_id'])) {
            $query->where('actor_id', (int) $validated['actor_id']);
        }

        if (isset($validated['target_type'])) {
            $query->where('target_type', $validated['target_type']);
        }

        $paginator = $query->orderByDesc('id')->paginate(
            max(1, min((int) ($validated['per_page'] ?? 50), 100)),
            ['*'],
            'page',
            max(1, (int) ($validated['page'] ?? 1)),
        );

        $data = array_map(
            fn (AdminAuditLog $log): array => $this->describe($log),
            $paginator->items(),
        );

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'scoped_to_actor' => ! $actor->isOwner(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function describe(AdminAuditLog $log): array
    {
        return [
            'id' => $log->getKey(),
            'action' => $log->action,
            'actor_id' => $log->actor_id,
            'actor_role' => $log->actor_role,
            'actor_label' => $log->actor?->displayLabel(),
            'target_type' => $log->target_type,
            'target_id' => $log->target_id,
            'context' => $log->context ?? [],
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401, 'Unauthenticated.');

        return $user;
    }
}
