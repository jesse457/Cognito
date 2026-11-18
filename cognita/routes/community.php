<?php

declare(strict_types=1);

use App\Http\Controllers\GroupController;
use App\Http\Controllers\Student\CourseController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Community routes (prefix: /community)
|--------------------------------------------------------------------------
| The learning platform: a course library, learner-made groups and the post
| feed lives in routes/questions.php under /questions.
|
*/

Route::get('courses', [CourseController::class, 'index'])->name('courses.index');
Route::get('courses/{course}', [CourseController::class, 'show'])->whereNumber('course')->name('courses.show');
Route::get('lessons/{lesson}', [CourseController::class, 'lesson'])->whereNumber('lesson')->name('lessons.show');
Route::post('lessons/{lesson}/progress', [CourseController::class, 'progress'])->whereNumber('lesson')->name('lessons.progress');

Route::get('groups', [GroupController::class, 'index'])->name('groups.index');
Route::post('groups', [GroupController::class, 'store'])->name('groups.store');
Route::get('groups/{group}', [GroupController::class, 'show'])->whereNumber('group')->name('groups.show');
Route::post('groups/{group}/join', [GroupController::class, 'join'])->whereNumber('group')->name('groups.join');
Route::delete('groups/{group}/leave', [GroupController::class, 'leave'])->whereNumber('group')->name('groups.leave');
