<?php

declare(strict_types=1);

use App\Http\Controllers\Student\AccountController;
use App\Http\Controllers\Student\AdaptiveController;
use App\Http\Controllers\Student\AuthController;
use App\Http\Controllers\Student\CourseController;
use App\Http\Controllers\Student\EnrollmentController;
use App\Http\Controllers\Student\GamificationController;
use App\Http\Controllers\Student\LessonController;
use App\Http\Controllers\Student\NotificationController;
use App\Http\Controllers\Student\PracticeSessionController;
use App\Http\Controllers\Student\ReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Student + auth surface (always on)
|--------------------------------------------------------------------------
*/

// --- Public authentication -------------------------------------------------
Route::post('register', [AuthController::class, 'register'])
    ->middleware('throttle:api')
    ->name('auth.register');

Route::post('login', [AuthController::class, 'login'])
    ->middleware('throttle:api')
    ->name('auth.login');

// --- Authenticated ---------------------------------------------------------
Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
    Route::get('me', [AuthController::class, 'me'])->name('auth.me');

    // Account self-service stays reachable while suspended (middleware exemption).
    Route::get('account', [AccountController::class, 'show'])->name('account.show');
    Route::put('account', [AccountController::class, 'update'])->name('account.update');
    Route::post('account/password', [AccountController::class, 'updatePassword'])->name('account.password');

    // Catalogue + learning.
    Route::get('courses', [CourseController::class, 'index'])->name('courses.index');
    Route::get('courses/{course}', [CourseController::class, 'show'])->name('courses.show');
    Route::post('courses/{course}/enroll', [EnrollmentController::class, 'store'])->name('courses.enroll');
    Route::get('courses/{course}/leaderboard', [GamificationController::class, 'leaderboard'])
        ->name('courses.leaderboard');

    Route::get('lessons/{lesson}', [LessonController::class, 'show'])->name('lessons.show');

    // Practice / quiz flow.
    Route::post('practice-sessions', [PracticeSessionController::class, 'store'])->name('practice.start');
    Route::post('practice-sessions/{session}/answers', [PracticeSessionController::class, 'answer'])
        ->name('practice.answer');
    Route::post('practice-sessions/{session}/complete', [PracticeSessionController::class, 'complete'])
        ->name('practice.complete');

    // Adaptive remediation.
    Route::get('adaptive/recommendations', [AdaptiveController::class, 'index'])->name('adaptive.index');

    // Gamification summary.
    Route::get('profile/xp', [GamificationController::class, 'profile'])->name('gamification.profile');

    // Notifications.
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])
        ->name('notifications.read');

    // Content reporting (available to every authenticated user).
    Route::post('reports', [ReportController::class, 'store'])->name('reports.store');
});
