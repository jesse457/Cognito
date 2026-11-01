<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ChangeRoleRequest;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Requests\Admin\ReasonRequest;
use App\Http\Requests\Admin\SuspendUserRequest;
use App\Http\Resources\Admin\UserResource;
use App\Models\User;
use App\Services\AdminScopeService;
use App\Services\ImpersonationService;
use App\Services\UserManagementService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Staff-facing user management. Every rank decision is delegated to
 * AdminScopeService / UserManagementService; the controller stays thin.
 */
final class AdminUserController extends Controller
{
    public function __construct(
        private readonly AdminScopeService $scope,
        private readonly UserManagementService $userManagement,
        private readonly ImpersonationService $impersonation,
    ) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $actor = $this->actor($request);

        $query = User::query();

        $search = $request->search();

        if ($search !== null) {
            $like = '%'.$search.'%';

            $query->where(function (Builder $inner) use ($like): void {
                $inner->where('name', 'ilike', $like)
                    ->orWhere('display_name', 'ilike', $like)
                    ->orWhere('email', 'ilike', $like);
            });
        }

        $role = $request->role();

        if ($role !== null) {
            $query->where('role', $role->value);
        }

        $status = $request->status();

        if ($status !== null) {
            $query->where('status', $status->value);
        }

        $paginator = $query->orderByDesc('id')
            ->paginate($request->perPage(), ['*'], 'page', $request->page());

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(
                    static fn (User $user): array => (new UserResource($user))->forActor($actor)->resolve($request),
                )
                ->values()
                ->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'filters' => [
                    'search' => $search,
                    'role' => $role?->value,
                    'status' => $status?->value,
                ],
            ],
        ]);
    }

    public function show(Request $request, int $user): JsonResponse
    {
        $actor = $this->actor($request);
        $target = $this->scope->findUserForAdmin($actor, $user);

        $resource = UserResource::make($target)
            ->forActor($actor)
            ->withModerationHistory();

        return response()->json(['data' => $resource->resolve($request)]);
    }

    public function warn(ReasonRequest $request, int $user): JsonResponse
    {
        $actor = $this->actor($request);
        $target = $this->scope->findUserForAdmin($actor, $user);

        $action = $this->userManagement->warn($actor, $target, $request->reason());

        return response()->json([
            'data' => [
                'moderation_action_id' => $action->getKey(),
                'action' => $action->action->value,
                'reason' => $action->reason,
                'expires_at' => $action->expires_at?->toIso8601String(),
                'user' => UserResource::make($target->refresh())->forActor($actor)->resolve($request),
            ],
        ], 201);
    }

    public function suspend(SuspendUserRequest $request, int $user): JsonResponse
    {
        $actor = $this->actor($request);
        $target = $this->scope->findUserForAdmin($actor, $user);

        $action = $this->userManagement->suspend(
            $actor,
            $target,
            $request->reason(),
            $request->days(),
        );

        return response()->json([
            'data' => [
                'moderation_action_id' => $action->getKey(),
                'action' => $action->action->value,
                'reason' => $action->reason,
                'expires_at' => $action->expires_at?->toIso8601String(),
                'user' => UserResource::make($target->refresh())->forActor($actor)->resolve($request),
            ],
        ], 201);
    }

    public function ban(ReasonRequest $request, int $user): JsonResponse
    {
        $actor = $this->actor($request);
        $target = $this->scope->findUserForAdmin($actor, $user);

        $action = $this->userManagement->ban($actor, $target, $request->reason());

        return response()->json([
            'data' => [
                'moderation_action_id' => $action->getKey(),
                'action' => $action->action->value,
                'reason' => $action->reason,
                'user' => UserResource::make($target->refresh())->forActor($actor)->resolve($request),
            ],
        ], 201);
    }

    public function unban(Request $request, int $user): JsonResponse
    {
        $actor = $this->actor($request);
        $target = $this->scope->findUserForAdmin($actor, $user);

        $reason = $request->input('reason');
        $reason = is_string($reason) && trim($reason) !== '' ? trim($reason) : 'manual unban';

        $action = $this->userManagement->unban($actor, $target, $reason);

        return response()->json([
            'data' => [
                'moderation_action_id' => $action->getKey(),
                'action' => $action->action->value,
                'reason' => $action->reason,
                'user' => UserResource::make($target->refresh())->forActor($actor)->resolve($request),
            ],
        ], 201);
    }

    public function changeRole(ChangeRoleRequest $request, int $user): JsonResponse
    {
        $actor = $this->actor($request);
        $target = $this->scope->findUserForAdmin($actor, $user);

        $updated = $this->userManagement->changeRole(
            $actor,
            $target,
            $request->role(),
            $request->reason(),
        );

        return response()->json([
            'data' => UserResource::make($updated)->forActor($actor)->resolve($request),
        ]);
    }

    public function impersonate(Request $request, int $user): JsonResponse
    {
        $actor = $this->actor($request);
        $target = $this->scope->findUserForAdmin($actor, $user);

        $result = $this->impersonation->start($actor, $target);

        return response()->json([
            'data' => [
                'token' => $result['token'],
                'impersonated_by' => $result['impersonated_by'],
                'expires_at' => $result['expires_at'],
                'user' => UserResource::make($result['user'])->forActor($actor)->resolve($request),
            ],
        ], 201);
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401, 'Unauthenticated.');

        return $user;
    }
}
