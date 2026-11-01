<?php

use App\Http\Middleware\BindAdminContext;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\EnsureUserHasMinimumRank;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'role.min' => EnsureUserHasMinimumRank::class,
            'active' => EnsureUserIsActive::class,
            'admin.context' => BindAdminContext::class,
        ]);

        // Every API request passes the account-status gate. It is a no-op for
        // guests, so applying it to the whole group is safe and means no route
        // can forget it.
        $middleware->appendToGroup('api', EnsureUserIsActive::class);

        // Inertia shares the authenticated actor, flashes and feature flags with
        // every panel page.
        $middleware->web(append: [HandleInertiaRequests::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
