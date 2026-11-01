<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AcceptStaffInvitationRequest;
use App\Http\Requests\Admin\StoreStaffInvitationRequest;
use App\Http\Resources\Admin\UserResource;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Services\AdminScopeService;
use App\Services\StaffInvitationService;
use App\Support\AdminContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Staff invitations.
 *
 * `store` / `revoke` live inside the admin group. `accept` is public: it is
 * registered in routes/api.php (outside the admin middleware) because the
 * invitee has no account yet, and it therefore establishes the AdminContext
 * actor itself from the invitation's inviter.
 */
final class StaffInvitationController extends Controller
{
    public function __construct(
        private readonly StaffInvitationService $invitations,
        private readonly AdminScopeService $scope,
        private readonly AdminContext $adminContext,
    ) {}

    public function store(StoreStaffInvitationRequest $request): JsonResponse
    {
        $actor = $this->actor($request);

        $invitation = $this->invitations->invite($actor, $request->email(), $request->role());

        return response()->json([
            'data' => [
                'id' => $invitation->getKey(),
                'email' => $invitation->email,
                'role' => $invitation->role->value,
                'expires_at' => $invitation->expires_at?->toIso8601String(),
                'accepted_at' => $invitation->accepted_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function revoke(Request $request, int $invitation): JsonResponse
    {
        $actor = $this->actor($request);

        $this->scope->assertCanViewAuditLogs($actor);

        $model = StaffInvitation::query()->findOrFail($invitation);

        $this->invitations->revoke($actor, $model);

        return response()->json([
            'data' => [
                'revoked' => true,
                'invitation_id' => $invitation,
            ],
        ]);
    }

    /**
     * PUBLIC endpoint: accepts a token, creates the invited account.
     */
    public function accept(AcceptStaffInvitationRequest $request, string $token): JsonResponse
    {
        $invitation = StaffInvitation::query()->where('token', $token)->first();

        if ($invitation !== null) {
            $inviter = User::query()->find($invitation->invited_by);

            // No authenticated user exists yet: the inviter is the audit actor
            // for every row written while accepting.
            if ($inviter !== null) {
                $this->adminContext->setActor($inviter);
                $this->adminContext->setRequestMeta(
                    $request->ip(),
                    substr((string) $request->userAgent(), 0, 500),
                );
            }
        }

        try {
            $user = $this->invitations->accept($token, $request->name(), $request->password());
        } finally {
            $this->adminContext->flush();
        }

        return response()->json([
            'data' => [
                'user' => UserResource::make($user)->forActor(null)->resolve($request),
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
