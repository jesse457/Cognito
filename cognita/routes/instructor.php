<?php

declare(strict_types=1);

use App\Http\Controllers\Instructor\InstructorAnalyticsController;
use App\Http\Controllers\Instructor\InstructorAnnouncementController;
use App\Http\Controllers\Instructor\InstructorAssignmentController;
use App\Http\Controllers\Instructor\InstructorBriefingController;
use App\Http\Controllers\Instructor\InstructorClassController;
use App\Http\Controllers\Instructor\InstructorDashboardController;
use App\Http\Controllers\Instructor\InstructorInvitationController;
use App\Http\Controllers\Instructor\InstructorNoteController;
use App\Http\Controllers\Instructor\InstructorStudentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Instructor portal routes (only mounted when features.instructor_path=true)
|--------------------------------------------------------------------------
| The group already supplies ['auth:sanctum', 'active', 'role:instructor'] and
| the 'instructor' prefix/name.
|
| `{class}`, `{student}` and `{note}` are plain integer parameters on purpose:
| Laravel's implicit binding would look for an App\Models\Class model. Every
| handler resolves them through App\Services\ClassAccessService instead, which
| is the portal's single data-scoping boundary (404 for a missing id, 403 for a
| class or student that belongs to another instructor).
*/

// Dashboard -----------------------------------------------------------------
Route::get('dashboard', [InstructorDashboardController::class, 'index'])->name('dashboard');

// Classes -------------------------------------------------------------------
Route::get('classes', [InstructorClassController::class, 'index'])->name('classes.index');
Route::post('classes', [InstructorClassController::class, 'store'])->name('classes.store');
Route::get('classes/{class}', [InstructorClassController::class, 'show'])
    ->whereNumber('class')
    ->name('classes.show');
Route::patch('classes/{class}', [InstructorClassController::class, 'update'])
    ->whereNumber('class')
    ->name('classes.update');
Route::delete('classes/{class}', [InstructorClassController::class, 'destroy'])
    ->whereNumber('class')
    ->name('classes.destroy');

// Per-class dashboard -------------------------------------------------------
Route::get('classes/{class}/dashboard', [InstructorDashboardController::class, 'show'])
    ->whereNumber('class')
    ->name('classes.dashboard');

// Students ------------------------------------------------------------------
Route::get('classes/{class}/students', [InstructorStudentController::class, 'index'])
    ->whereNumber('class')
    ->name('classes.students.index');
Route::get('classes/{class}/students/{student}', [InstructorStudentController::class, 'show'])
    ->whereNumber('class')
    ->whereNumber('student')
    ->name('classes.students.show');

// Private instructor notes --------------------------------------------------
Route::get('classes/{class}/students/{student}/notes', [InstructorNoteController::class, 'index'])
    ->whereNumber('class')
    ->whereNumber('student')
    ->name('classes.students.notes.index');
Route::post('classes/{class}/students/{student}/notes', [InstructorNoteController::class, 'store'])
    ->whereNumber('class')
    ->whereNumber('student')
    ->name('classes.students.notes.store');
Route::get('classes/{class}/notes/{note}', [InstructorNoteController::class, 'show'])
    ->whereNumber('class')
    ->whereNumber('note')
    ->name('classes.notes.show');
Route::delete('classes/{class}/notes/{note}', [InstructorNoteController::class, 'destroy'])
    ->whereNumber('class')
    ->whereNumber('note')
    ->name('classes.notes.destroy');

// Analytics -----------------------------------------------------------------
Route::get('classes/{class}/heatmap', [InstructorAnalyticsController::class, 'heatmap'])
    ->whereNumber('class')
    ->name('classes.heatmap');
Route::get('classes/{class}/at-risk', [InstructorAnalyticsController::class, 'atRisk'])
    ->whereNumber('class')
    ->name('classes.at-risk');
Route::post('classes/{class}/analytics/snapshot', [InstructorAnalyticsController::class, 'snapshot'])
    ->whereNumber('class')
    ->name('classes.analytics.snapshot');

// Announcements -------------------------------------------------------------
Route::get('classes/{class}/announcements', [InstructorAnnouncementController::class, 'index'])
    ->whereNumber('class')
    ->name('classes.announcements.index');
Route::post('classes/{class}/announcements', [InstructorAnnouncementController::class, 'store'])
    ->whereNumber('class')
    ->name('classes.announcements.store');

// Content assignment --------------------------------------------------------
Route::post('classes/{class}/courses', [InstructorAssignmentController::class, 'assignCourse'])
    ->whereNumber('class')
    ->name('classes.courses.store');
Route::post('classes/{class}/students/{student}/lessons', [InstructorAssignmentController::class, 'assignLesson'])
    ->whereNumber('class')
    ->whereNumber('student')
    ->name('classes.students.lessons.store');

// Invitations ---------------------------------------------------------------
Route::post('classes/{class}/invitations', [InstructorInvitationController::class, 'store'])
    ->whereNumber('class')
    ->name('classes.invitations.store');

// AI briefing ---------------------------------------------------------------
Route::get('classes/{class}/briefing', [InstructorBriefingController::class, 'show'])
    ->whereNumber('class')
    ->name('classes.briefing');
