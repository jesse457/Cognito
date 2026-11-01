<?php

namespace App\Providers;

use App\Services\AuditLogService;
use App\Support\AdminContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\DevCommands;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Scoped (per request / per queued job), never a cross-request
        // singleton, so an admin actor can never leak between requests.
        $this->app->scoped(AdminContext::class);
        $this->app->scoped(AuditLogService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {

        DevCommands::artisan('serve --host=0.0.0.0', 'server');
        // Content reports store short aliases ('course', 'forum_thread', ...)
        // rather than fully-qualified class names, per the Phase 4 schema.
        Relation::morphMap(config('cognita.morph_map', []));

        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute(120)->by(
                $request->user()?->getAuthIdentifier() ?? $request->ip(),
            );
        });

        // Console sign-in: five attempts per minute per email+IP pair.
        RateLimiter::for('login', function (Request $request): Limit {
            return Limit::perMinute(5)->by(
                mb_strtolower((string) $request->input('email')).'|'.$request->ip(),
            );
        });

        // LiveKit token minting is cheap but should never be scriptable.
        RateLimiter::for('live-call-token', function (Request $request): Limit {
            return Limit::perMinute(60)->by(
                $request->user()?->getAuthIdentifier() ?? $request->ip(),
            );
        });
    }
}
