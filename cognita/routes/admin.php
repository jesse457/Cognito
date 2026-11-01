<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AdminReportController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CourseModerationController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ForumModerationController;
use App\Http\Controllers\Admin\ImpersonationController;
use App\Http\Controllers\Admin\StaffInvitationController;
use App\Http\Controllers\Admin\SystemSettingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin panel routes (always mounted)
|--------------------------------------------------------------------------
| The surrounding group in routes/api.php already supplies
| ['auth:sanctum', 'active', 'role.min:moderator', 'admin.context'], the
| `admin` URI prefix and the `admin.` name prefix. This file must not
| re-declare them.
|
| Rank rules that go beyond "moderator and up" are enforced by
| App\Services\AdminScopeService inside the controllers and services, so a
| single route table can serve every staff rank (with a redacted payload for
| moderators).
|
| NOTE: POST admin/staff/invitations/{token}/accept is registered PUBLICLY in
| routes/api.php — do not add it here.
*/

// --- Dashboard -------------------------------------------------------------
Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

// --- User management -------------------------------------------------------
Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
Route::get('users/{user}', [AdminUserController::class, 'show'])->whereNumber('user')->name('users.show');
Route::post('users/{user}/warn', [AdminUserController::class, 'warn'])->whereNumber('user')->name('users.warn');
Route::post('users/{user}/suspend', [AdminUserController::class, 'suspend'])->whereNumber('user')->name('users.suspend');
Route::post('users/{user}/ban', [AdminUserController::class, 'ban'])->whereNumber('user')->name('users.ban');
Route::post('users/{user}/unban', [AdminUserController::class, 'unban'])->whereNumber('user')->name('users.unban');
Route::post('users/{user}/role', [AdminUserController::class, 'changeRole'])->whereNumber('user')->name('users.role');
Route::post('users/{user}/impersonate', [AdminUserController::class, 'impersonate'])
    ->whereNumber('user')
    ->name('users.impersonate');

// Impersonation teardown is its own endpoint so the stop is auditable.
Route::post('impersonation/stop', [ImpersonationController::class, 'stop'])->name('impersonation.stop');

// --- Content reports -------------------------------------------------------
Route::get('reports', [AdminReportController::class, 'index'])->name('reports.index');
Route::post('reports/bulk-resolve', [AdminReportController::class, 'bulkResolve'])->name('reports.bulk-resolve');
Route::get('reports/{report}', [AdminReportController::class, 'show'])->whereNumber('report')->name('reports.show');
Route::post('reports/{report}/assign', [AdminReportController::class, 'assign'])
    ->whereNumber('report')
    ->name('reports.assign');
Route::post('reports/{report}/resolve', [AdminReportController::class, 'resolve'])
    ->whereNumber('report')
    ->name('reports.resolve');
Route::post('reports/{report}/dismiss', [AdminReportController::class, 'dismiss'])
    ->whereNumber('report')
    ->name('reports.dismiss');

// --- Course moderation -----------------------------------------------------
Route::post('courses/{course}/remove', [CourseModerationController::class, 'remove'])
    ->whereNumber('course')
    ->name('courses.remove');
Route::post('courses/{course}/restore', [CourseModerationController::class, 'restore'])
    ->whereNumber('course')
    ->name('courses.restore');

// --- Forum moderation ------------------------------------------------------
Route::post('forum/threads/{thread}/lock', [ForumModerationController::class, 'lockThread'])
    ->whereNumber('thread')
    ->name('forum.threads.lock');
Route::delete('forum/threads/{thread}', [ForumModerationController::class, 'removeThread'])
    ->whereNumber('thread')
    ->name('forum.threads.remove');
Route::post('forum/posts/{post}/hide', [ForumModerationController::class, 'hidePost'])
    ->whereNumber('post')
    ->name('forum.posts.hide');
Route::delete('forum/posts/{post}', [ForumModerationController::class, 'removePost'])
    ->whereNumber('post')
    ->name('forum.posts.remove');

// --- Audit trail -----------------------------------------------------------
Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

// --- System settings (owner only, enforced in the service) -----------------
Route::get('settings', [SystemSettingController::class, 'index'])->name('settings.index');
Route::put('settings', [SystemSettingController::class, 'update'])->name('settings.update');

// --- Staff invitations (accept is public, registered in routes/api.php) ----
Route::post('staff/invitations', [StaffInvitationController::class, 'store'])->name('staff.invitations.store');
Route::delete('staff/invitations/{invitation}', [StaffInvitationController::class, 'revoke'])
    ->whereNumber('invitation')
    ->name('staff.invitations.revoke');
