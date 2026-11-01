<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects banned users always, and suspended users until `suspended_until`
 * elapses. The only exempt endpoints are the account self-service routes and
 * logout, so a suspended user can still read their own status and sign out.
 *
 * Registered both as the `active` route alias and on the whole `api` group, so
 * no authenticated endpoint can accidentally skip it.
 */
class EnsureUserIsActive
{
    /** @var list<string> */
    private const EXEMPT_PATTERNS = [
        'api/account',
        'api/account/*',
        'api/logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        if ($user->isBanned()) {
            abort(403, 'This account has been banned.');
        }

        if ($user->hasActiveSuspension() && ! $request->is(...self::EXEMPT_PATTERNS)) {
            abort(403, 'This account is suspended.');
        }

        return $next($request);
    }
}
