<?php

declare(strict_types=1);

use App\Http\Controllers\Student\AttendanceController;
use App\Http\Controllers\Student\ClassroomController;
use App\Http\Controllers\Student\HomeController;
use App\Http\Controllers\Student\MaterialController;
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

Route::get('classes', [ClassroomController::class, 'index'])->name('classes.index');
Route::get('classes/{classroom}', [ClassroomController::class, 'show'])
    ->whereNumber('classroom')
    ->name('classes.show');

Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
Route::get('materials', [MaterialController::class, 'index'])->name('materials.index');
