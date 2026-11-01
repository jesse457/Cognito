<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\JoinController;
use App\Http\Controllers\LiveCallController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web routes
|--------------------------------------------------------------------------
|
| Three surfaces, one router:
|   /admin/*       administrators only
|   /instructor/*  instructors only
|   /my-classes    students only (their class key is the door)
|
| The live call and its shared board are open to the instructor and to the
| students of a class, so they live here rather than inside one surface.
|
*/

// --- Public -----------------------------------------------------------------
Route::get('/', WelcomeController::class)->name('welcome');

// The class-key door works before sign-in: the key is remembered and applied
// once the student has an account.
Route::post('join', [JoinController::class, 'store'])->middleware('throttle:20,1')->name('join.store');

Route::middleware('guest')->group(function (): void {
    Route::get('login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::get('register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
});

// --- Signed in --------------------------------------------------------------
Route::middleware('auth')->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Live group call for a class (instructor host, enrolled students).
    Route::get('classes/{classroom}/call', [LiveCallController::class, 'show'])
        ->whereNumber('classroom')
        ->name('call.show');

    Route::post('classes/{classroom}/call/token', [LiveCallController::class, 'token'])
        ->whereNumber('classroom')
        ->middleware('throttle:30,1')
        ->name('call.token');

    // Shared board: state, document upload and document streaming.
    Route::patch('classes/{classroom}/board', [BoardController::class, 'update'])
        ->whereNumber('classroom')
        ->middleware('throttle:240,1')
        ->name('board.update');

    Route::post('classes/{classroom}/board/document', [BoardController::class, 'storeDocument'])
        ->whereNumber('classroom')
        ->name('board.document.store');

    Route::delete('classes/{classroom}/board/document', [BoardController::class, 'destroyDocument'])
        ->whereNumber('classroom')
        ->name('board.document.destroy');

    Route::get('classes/{classroom}/board/document', [BoardController::class, 'document'])
        ->whereNumber('classroom')
        ->name('board.document');
});

// --- Role surfaces ----------------------------------------------------------
Route::middleware(['auth', 'role:student'])
    ->prefix('my-classes')
    ->name('student.')
    ->group(base_path('routes/student.php'));

Route::middleware(['auth', 'role:instructor'])
    ->prefix('instructor')
    ->name('instructor.')
    ->group(base_path('routes/instructor.php'));

Route::middleware(['auth', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(base_path('routes/admin.php'));
