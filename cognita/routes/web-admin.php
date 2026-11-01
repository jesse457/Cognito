<?php

declare(strict_types=1);

use App\Http\Controllers\Panel\Admin\AuditController;
use App\Http\Controllers\Panel\Admin\CourseController;
use App\Http\Controllers\Panel\Admin\DashboardController;
use App\Http\Controllers\Panel\Admin\InvitationController;
use App\Http\Controllers\Panel\Admin\ReportController;
use App\Http\Controllers\Panel\Admin\SettingController;
use App\Http\Controllers\Panel\Admin\UserActionController;
use App\Http\Controllers\Panel\Admin\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin panel console routes
|--------------------------------------------------------------------------
| The surrounding group in routes/web.php supplies ['auth', 'active',
| 'role.min:moderator', 'admin.context'] plus the /admin prefix and the
| panel.admin. name prefix.
*/

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

// --- User management --------------------------------------------------------
Route::get('users', [UserController::class, 'index'])->name('users.index');
Route::get('users/{user}', [UserController::class, 'show'])->whereNumber('user')->name('users.show');

Route::post('users/{user}/warn', [UserActionController::class, 'warn'])->whereNumber('user')->name('users.warn');
Route::post('users/{user}/suspend', [UserActionController::class, 'suspend'])->whereNumber('user')->name('users.suspend');
Route::post('users/{user}/ban', [UserActionController::class, 'ban'])->whereNumber('user')->name('users.ban');
Route::post('users/{user}/unban', [UserActionController::class, 'unban'])->whereNumber('user')->name('users.unban');
Route::post('users/{user}/role', [UserActionController::class, 'changeRole'])->whereNumber('user')->name('users.role');

// --- Moderation queue -------------------------------------------------------
Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
Route::get('reports/{report}', [ReportController::class, 'show'])->whereNumber('report')->name('reports.show');
Route::post('reports/{report}/assign', [ReportController::class, 'assign'])->whereNumber('report')->name('reports.assign');
Route::post('reports/{report}/resolve', [ReportController::class, 'resolve'])->whereNumber('report')->name('reports.resolve');
Route::post('reports/{report}/dismiss', [ReportController::class, 'dismiss'])->whereNumber('report')->name('reports.dismiss');

// --- Course moderation ------------------------------------------------------
Route::get('courses', [CourseController::class, 'index'])->name('courses.index');
Route::post('courses/{course}/remove', [CourseController::class, 'remove'])->whereNumber('course')->name('courses.remove');
Route::post('courses/{course}/restore', [CourseController::class, 'restore'])->whereNumber('course')->name('courses.restore');

// --- Audit trail ------------------------------------------------------------
Route::get('audit', [AuditController::class, 'index'])->name('audit.index');

// --- Owner-only surfaces (authorization enforced server-side) ---------------
Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
Route::put('settings', [SettingController::class, 'update'])->name('settings.update');

Route::get('invitations', [InvitationController::class, 'index'])->name('invitations.index');
Route::post('invitations', [InvitationController::class, 'store'])->name('invitations.store');
Route::delete('invitations/{invitation}', [InvitationController::class, 'destroy'])
    ->whereNumber('invitation')
    ->name('invitations.destroy');
