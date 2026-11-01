<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\StaffInvitationController;
use App\Http\Controllers\Student\LiveCallController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Cognita API routes
|--------------------------------------------------------------------------
|
| Three surfaces are stacked here:
|   - student/auth     : always on (routes/student.php)
|   - admin panel      : ALWAYS mounted (routes/admin.php) — moderation is a
|                        baseline requirement, never feature-flagged
|   - instructor portal: mounted only when features.instructor_path is true.
|                        With the flag off the routes DO NOT EXIST (404), which
|                        is why registration is conditional rather than
|                        middleware-guarded.
|   - community        : mounted only when features.social is true.
|
*/

// Student + auth surface (always on).
Route::group([], base_path('routes/student.php'));

// Class group voice call tokens for the API-first student client.
if (config('features.live_calls')) {
    Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
        Route::post('classes/{class}/live-call/token', [LiveCallController::class, 'token'])
            ->middleware('throttle:live-call-token')
            ->whereNumber('class')
            ->name('api.live-calls.token');
    });
}

// Public staff-invitation acceptance. Deliberately registered OUTSIDE the admin
// group: the invitee has no account/session yet. Token + expiry are validated
// inside the controller.
Route::post('admin/staff/invitations/{token}/accept', [StaffInvitationController::class, 'accept'])
    ->name('admin.staff.invitations.accept');

// Admin panel — always mounted. `role.min:moderator` means student/instructor
// get 403 while moderator/admin/owner get through.
Route::middleware(['auth:sanctum', 'active', 'role.min:moderator', 'admin.context'])
    ->prefix('admin')
    ->name('admin.')
    ->group(base_path('routes/admin.php'));

// Instructor portal — conditional registration (not middleware-gated).
if (config('features.instructor_path')) {
    Route::middleware(['auth:sanctum', 'active', 'role:instructor'])
        ->prefix('instructor')
        ->name('instructor.')
        ->group(base_path('routes/instructor.php'));
}

// Community — conditional registration.
if (config('features.social')) {
    Route::middleware(['auth:sanctum', 'active'])
        ->prefix('community')
        ->name('community.')
        ->group(base_path('routes/community.php'));
}
