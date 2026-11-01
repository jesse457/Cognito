<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin routes (prefix: /admin, middleware: auth + role:admin)
|--------------------------------------------------------------------------
| Account administration plus a read-only inventory of courses and classes.
|
*/

Route::get('/', DashboardController::class)->name('dashboard');

Route::get('users', [UserController::class, 'index'])->name('users.index');
Route::patch('users/{user}/role', [UserController::class, 'updateRole'])->whereNumber('user')->name('users.role');
Route::delete('users/{user}', [UserController::class, 'destroy'])->whereNumber('user')->name('users.destroy');

Route::get('courses', [InventoryController::class, 'courses'])->name('courses.index');
Route::get('classrooms', [InventoryController::class, 'classrooms'])->name('classrooms.index');
