<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\UserResource;
use App\Models\AdminAuditLog;
use App\Models\ModerationAction;
use App\Models\User;
use App\Services\AdminScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff-facing user directory. Moderators receive a redacted projection (no
 * email); admins and owners see the operational account record.
 */
class UserController extends Controller
{
    public function index(Request $request, AdminScopeService $scope): Response
    {
        Gate::authorize('viewAny', User::class);

        /** @var User $actor */
        $actor = $request->user();

        $search = $request->string('search')->trim()->toString();
        $role = $request->string('role')->toString();
        $status = $request->string('status')->toString();

        $users = User::query()
            ->when($search !== '', function ($query) use ($search): void {
                $like = '%'.$search.'%';
                $query->where(fn ($inner) => $inner
                    ->where('name', 'ilike', $like)
                    ->orWhere('display_name', 'ilike', $like)
                    ->orWhere('email', 'ilike', $like));
            })
            ->when($role !== '', fn ($query) => $query->where('role', $role))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $user): array => (new UserResource($user))->forActor($actor)->resolve($request));

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'role' => $role,
                'status' => $status,
            ],
            'roles' => array_map(static fn (UserRole $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
                'rank' => $case->rank(),
            ], UserRole::cases()),
            'statuses' => array_map(static fn (UserStatus $case): string => $case->value, UserStatus::cases()),
            'capabilities' => [
                'is_privileged' => $actor->roleAtLeast(UserRole::Admin),
                'can_moderate' => $actor->roleAtLeast(UserRole::Moderator),
            ],
        ]);
    }

    public function show(Request $request, AdminScopeService $scope, int $user): Response
    {
        Gate::authorize('viewAny', User::class);

        /** @var User $actor */
        $actor = $request->user();
        $target = $scope->findUserForAdmin($actor, $user);

        $moderationHistory = ModerationAction::query()
            ->with('actor:id,name,display_name')
            ->where('target_user_id', $target->getKey())
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(fn (ModerationAction $action): array => [
                'id' => $action->getKey(),
                'action' => $action->action->value,
                'reason' => $action->reason,
                'actor' => $action->actor?->displayLabel(),
                'expires_at' => $action->expires_at?->toIso8601String(),
                'created_at' => $action->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $auditHistory = $scope
            ->scopeAuditLogsFor($actor, AdminAuditLog::query())
            ->where('target_type', 'user')
            ->where('target_id', $target->getKey())
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(fn (AdminAuditLog $log): array => [
                'id' => $log->getKey(),
                'action' => $log->action,
                'actor' => $log->actor_id,
                'actor_role' => $log->actor_role,
                'created_at' => $log->created_at?->toIso8601String(),
                'context' => $log->context,
            ])
            ->values()
            ->all();

        return Inertia::render('Admin/Users/Show', [
            'user' => (new UserResource($target))->forActor($actor)->resolve($request),
            'moderationHistory' => $moderationHistory,
            'auditHistory' => $auditHistory,
            'capabilities' => [
                'can_warn' => Gate::forUser($actor)->allows('warn', $target),
                'can_suspend' => Gate::forUser($actor)->allows('suspend', $target),
                'can_ban' => Gate::forUser($actor)->allows('ban', $target),
                'can_unban' => Gate::forUser($actor)->allows('unban', $target),
                'can_change_role' => Gate::forUser($actor)->allows('changeRole', $target),
                'can_impersonate' => Gate::forUser($actor)->allows('impersonate', $target),
                'role_options' => $this->roleOptionsFor($actor),
            ],
        ]);
    }

    /** @return list<array{value:string,label:string,rank:int}> */
    private function roleOptionsFor(User $actor): array
    {
        return array_values(array_map(
            static fn (UserRole $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
                'rank' => $case->rank(),
            ],
            array_filter(UserRole::cases(), static fn (UserRole $case): bool => $case->rank() <= $actor->role->rank()),
        ));
    }
}
