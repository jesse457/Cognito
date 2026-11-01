<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level role gate: `role:admin` or `role:instructor,admin`.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(401);
        }

        $role = $user->role;

        if (! $role instanceof UserRole || ! in_array($role->value, $roles, true)) {
            abort(403, 'Your account does not have access to this area.');
        }

        return $next($request);
    }
}
