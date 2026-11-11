<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);

        // Inertia shares the signed-in actor and one-shot flash messages with
        // every page.
        $middleware->web(append: [HandleInertiaRequests::class]);

        // .dev/lan-forward serves the app over HTTPS so a phone on the LAN gets a
        // secure origin (no secure origin, no microphone). Without this the app
        // reads the proxy's plain-HTTP hop and hands the browser http:// asset
        // and WebSocket URLs on an https page, which the browser then refuses.
        // Trusting the private ranges keeps a spoofed header from a public
        // client out of the forwarded values.
        $middleware->trustProxies(at: [
            '127.0.0.1',
            '::1',
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
        ], headers: Request::HEADER_X_FORWARDED_FOR
            | Request::HEADER_X_FORWARDED_HOST
            | Request::HEADER_X_FORWARDED_PORT
            | Request::HEADER_X_FORWARDED_PROTO
            | Request::HEADER_X_FORWARDED_PREFIX);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->expectsJson(),
        );

        // The call page fetches the board over JSON; keep validation errors in
        // the same shape as the rest of the app.
        $exceptions->dontFlash(['strokes']);
    })->create();
