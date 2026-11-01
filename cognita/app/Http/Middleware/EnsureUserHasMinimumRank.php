<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Minimum-rank gate: `role.min:moderator` allows moderator, admin and owner.
 */
class EnsureUserHasMinimumRank
{
    public function handle(Request $request, Closure $next, string $minimumRole): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(401, 'Unauthenticated.');
        }

        $minimum = UserRole::from($minimumRole);

        if (! $user->roleAtLeast($minimum)) {
            abort(403, 'You do not have the required role rank.');
        }

        return $next($request);
    }
}
