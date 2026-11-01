<?php

declare(strict_types=1);

use App\Http\Controllers\Panel\Instructor\AnalyticsController;
use App\Http\Controllers\Panel\Instructor\AnnouncementController;
use App\Http\Controllers\Panel\Instructor\AssignmentController;
use App\Http\Controllers\Panel\Instructor\ClassController;
use App\Http\Controllers\Panel\Instructor\DashboardController;
use App\Http\Controllers\Panel\Instructor\InvitationController;
use App\Http\Controllers\Panel\Instructor\NoteController;
use App\Http\Controllers\Panel\Instructor\StudentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Instructor portal console routes (mounted only when the flag is on)
|--------------------------------------------------------------------------
| The surrounding group in routes/web.php supplies ['auth', 'active',
| 'role:instructor'] plus the /instructor prefix and panel.instructor. names.
*/

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

Route::get('classes', [ClassController::class, 'index'])->name('classes.index');
Route::get('classes/{class}', [ClassController::class, 'show'])->whereNumber('class')->name('classes.show');

Route::post('classes/{class}/announcements', [AnnouncementController::class, 'store'])
    ->whereNumber('class')
    ->name('classes.announcements.store');

Route::post('classes/{class}/courses', [AssignmentController::class, 'assignCourse'])
    ->whereNumber('class')
    ->name('classes.courses.store');

Route::post('classes/{class}/students/{student}/lessons', [AssignmentController::class, 'assignLesson'])
    ->whereNumber('class')
    ->whereNumber('student')
    ->name('classes.students.lessons.store');

Route::post('classes/{class}/invitations', [InvitationController::class, 'store'])
    ->whereNumber('class')
    ->name('classes.invitations.store');

Route::post('classes/{class}/snapshot', [AnalyticsController::class, 'snapshot'])
    ->whereNumber('class')
    ->name('classes.snapshot');

Route::get('classes/{class}/students/{student}', [StudentController::class, 'show'])
    ->whereNumber('class')
    ->whereNumber('student')
    ->name('classes.students.show');

Route::post('classes/{class}/students/{student}/notes', [NoteController::class, 'store'])
    ->whereNumber('class')
    ->whereNumber('student')
    ->name('classes.students.notes.store');
