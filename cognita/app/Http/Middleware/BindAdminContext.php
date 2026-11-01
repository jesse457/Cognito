<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\AdminContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Binds the authenticated staff actor to the request-scoped AdminContext.
 *
 * Mounted on the admin route group only, so the LogsAdminActivity trait never
 * audits public/student actions. Request metadata (IP + user agent) is captured
 * here once and reused for every audit row written during the request.
 */
class BindAdminContext
{
    public function __construct(private readonly AdminContext $adminContext) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null) {
            $this->adminContext->setActor($user);
            $this->adminContext->setRequestMeta($request->ip(), substr((string) $request->userAgent(), 0, 500));
        }

        return $next($request);
    }
}
