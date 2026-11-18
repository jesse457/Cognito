<?php

declare(strict_types=1);

use App\Http\Controllers\Student\AttendanceController;
use App\Http\Controllers\Student\ClassroomController;
use App\Http\Controllers\Student\CourseController;
use App\Http\Controllers\Student\HomeController;
use App\Http\Controllers\Student\MaterialController;
use App\Http\Controllers\Student\PaymentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Student routes (prefix: /my-classes, middleware: auth + role:student)
|--------------------------------------------------------------------------
| The home page is the class list plus the key form. Joining itself is handled
| by the public JoinController so the same key form works before and after
| sign-in. The remaining pages are read-only views of the same membership:
| every class, the attendance the call recorded, and the PDFs the class keeps.
|
*/

Route::get('/', [HomeController::class, 'index'])->name('home');

// Self-paced courses: outline, lessons and progress.
Route::get('courses', [CourseController::class, 'index'])->name('courses.index');
Route::get('courses/{course}', [CourseController::class, 'show'])
    ->whereNumber('course')
    ->name('courses.show');
Route::get('lessons/{lesson}', [CourseController::class, 'lesson'])
    ->whereNumber('lesson')
    ->name('lessons.show');
Route::post('lessons/{lesson}/progress', [CourseController::class, 'progress'])
    ->whereNumber('lesson')
    ->name('lessons.progress');

Route::get('classes', [ClassroomController::class, 'index'])->name('classes.index');
Route::get('classes/{classroom}', [ClassroomController::class, 'show'])
    ->whereNumber('classroom')
    ->name('classes.show');

// Paid courses: tell the instructor a payment was made; only their
// confirmation unlocks the live room.
Route::post('classes/{classroom}/payment', [PaymentController::class, 'store'])
    ->whereNumber('classroom')
    ->name('payment.store');

Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
Route::get('materials', [MaterialController::class, 'index'])->name('materials.index');
