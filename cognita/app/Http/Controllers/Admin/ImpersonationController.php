<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminScopeService;
use App\Services\ImpersonationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Closure of an impersonation session.
 *
 * Lives as its own endpoint (instead of a token revoke) so the stop itself is
 * auditable: `impersonation.stop` is written with the acting account as actor.
 */
final class ImpersonationController extends Controller
{
    public function __construct(
        private readonly ImpersonationService $impersonation,
        private readonly AdminScopeService $scope,
    ) {}

    public function stop(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 401, 'Unauthenticated.');

        $impersonatedUserId = $this->impersonation->impersonatedById($actor);

        $impersonated = $impersonatedUserId === null
            ? null
            : $this->scope->getUserOrFail($impersonatedUserId);

        $this->impersonation->stop($actor, $impersonated);

        return response()->json([
            'data' => [
                'stopped' => true,
                'impersonated_user_id' => $impersonated?->getKey(),
            ],
        ]);
    }
}
