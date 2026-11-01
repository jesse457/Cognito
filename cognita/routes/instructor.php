<?php

declare(strict_types=1);

use App\Http\Controllers\Instructor\ClassroomController;
use App\Http\Controllers\Instructor\CourseController;
use App\Http\Controllers\Instructor\DashboardController;
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
Route::post('classes', [ClassroomController::class, 'store'])->name('classes.store');
Route::get('classes/{classroom}', [ClassroomController::class, 'show'])
    ->whereNumber('classroom')
    ->name('classes.show');
Route::patch('classes/{classroom}', [ClassroomController::class, 'update'])
    ->whereNumber('classroom')
    ->name('classes.update');
Route::delete('classes/{classroom}', [ClassroomController::class, 'destroy'])
    ->whereNumber('classroom')
    ->name('classes.destroy');
Route::post('classes/{classroom}/key', [ClassroomController::class, 'rotateKey'])
    ->whereNumber('classroom')
    ->name('classes.key');
