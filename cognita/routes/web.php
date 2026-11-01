<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\LiveCallController;
use App\Http\Controllers\Panel\HomeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Console (Inertia) routes
|--------------------------------------------------------------------------
|
| The JSON API lives under /api and is untouched by the console. These routes
| render Inertia pages that talk to the same services and policies.
|
|   admin panel      : always mounted (moderation is a baseline requirement)
|   instructor portal: mounted only when features.instructor_path is true
|
*/

// --- Guest ------------------------------------------------------------------
Route::middleware('guest')->group(function (): void {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store'])->middleware('throttle:login');
});

// --- Authenticated entry ----------------------------------------------------
Route::post('logout', LogoutController::class)->middleware('auth')->name('logout');
Route::get('/', HomeController::class)->middleware(['auth', 'active'])->name('home');

// --- Class group voice calls (LiveKit) --------------------------------------
if (config('features.live_calls')) {
    Route::middleware(['auth', 'active'])->group(function (): void {
        Route::get('live-calls/{class}', [LiveCallController::class, 'show'])
            ->whereNumber('class')
            ->name('live-calls.show');
        Route::post('live-calls/{class}/token', [LiveCallController::class, 'token'])
            ->middleware('throttle:live-call-token')
            ->whereNumber('class')
            ->name('live-calls.token');
    });
}

// --- Admin panel (always mounted) -------------------------------------------
Route::middleware(['auth', 'active', 'role.min:moderator', 'admin.context'])
    ->prefix('admin')
    ->name('panel.admin.')
    ->group(base_path('routes/web-admin.php'));

// --- Instructor portal (only mounted when enabled) --------------------------
if (config('features.instructor_path')) {
    Route::middleware(['auth', 'active', 'role:instructor'])
        ->prefix('instructor')
        ->name('panel.instructor.')
        ->group(base_path('routes/web-instructor.php'));
}
