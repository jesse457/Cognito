<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Exact-role gate: `role:admin,owner`.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $this->deny($request, 'Authentication required.');
        }

        $allowed = array_map(
            static fn (string $role): UserRole => UserRole::from($role),
            $roles,
        );

        if (! in_array($user->role, $allowed, true)) {
            return $this->deny($request, 'You do not have the required role.');
        }

        return $next($request);
    }

    private function deny(Request $request, string $message): Response
    {
        if ($request->user() === null) {
            abort(401, 'Unauthenticated.');
        }

        abort(403, $message);
    }
}
