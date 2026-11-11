<?php

declare(strict_types=1);

use App\Http\Controllers\Instructor\AttendanceController;
use App\Http\Controllers\Instructor\AttendanceExportController;
use App\Http\Controllers\Instructor\ClassroomController;
use App\Http\Controllers\Instructor\CourseController;
use App\Http\Controllers\Instructor\DashboardController;
use App\Http\Controllers\Instructor\StudentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Instructor routes (prefix: /instructor, middleware: auth + role:instructor)
|--------------------------------------------------------------------------
| Courses and classes only. Each class owns one live group call and one board.
|
*/

Route::get('/', DashboardController::class)->name('dashboard');

// Courses -------------------------------------------------------------------
Route::get('courses', [CourseController::class, 'index'])->name('courses.index');
Route::post('courses', [CourseController::class, 'store'])->name('courses.store');
Route::patch('courses/{course}', [CourseController::class, 'update'])->whereNumber('course')->name('courses.update');
Route::delete('courses/{course}', [CourseController::class, 'destroy'])->whereNumber('course')->name('courses.destroy');

// Classes -------------------------------------------------------------------
Route::get('classes', [ClassroomController::class, 'index'])->name('classes.index');
Route::post('classes', [ClassroomController::class, 'store'])->name('classes.store');
Route::get('classes/{classroom}', [ClassroomController::class, 'show'])
    ->whereNumber('classroom')
    ->name('classes.show');

// The people and the register across every class, not one class at a time.
Route::get('students', [StudentController::class, 'index'])->name('students.index');
Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
Route::patch('classes/{classroom}', [ClassroomController::class, 'update'])
    ->whereNumber('classroom')
    ->name('classes.update');
Route::delete('classes/{classroom}', [ClassroomController::class, 'destroy'])
    ->whereNumber('classroom')
    ->name('classes.destroy');
Route::post('classes/{classroom}/key', [ClassroomController::class, 'rotateKey'])
    ->whereNumber('classroom')
    ->name('classes.key');
Route::patch('classes/{classroom}/students/{student}/drawing', [ClassroomController::class, 'updateDrawing'])
    ->whereNumber(['classroom', 'student'])
    ->name('classes.students.drawing');
// The register: who turned up on a given day, and the two downloads.
Route::get('classes/{classroom}/attendance', [AttendanceController::class, 'show'])
    ->whereNumber('classroom')
    ->name('classes.attendance');

Route::get('classes/{classroom}/attendance/export/{format}', AttendanceExportController::class)
    ->whereNumber('classroom')
    ->whereIn('format', ['xlsx', 'pdf'])
    ->name('classes.attendance.export');
