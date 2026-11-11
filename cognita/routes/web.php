<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardDocumentController;
use App\Http\Controllers\CallAttendanceController;
use App\Http\Controllers\CallModerationController;
use App\Http\Controllers\CallSessionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\JoinController;
use App\Http\Controllers\LiveCallController;
use App\Http\Controllers\PollController;
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

    // Health report for the caller's own address, shown when a join fails.
    Route::get('classes/{classroom}/call/doctor', [LiveCallController::class, 'doctor'])
        ->whereNumber('classroom')
        ->middleware('throttle:20,1')
        ->name('call.doctor');

    // The room itself: heartbeat while the call is open, leave when it ends,
    // and the host's "start a fresh board" control. Ink lives with the room.
    Route::post('classes/{classroom}/call/session/touch', [CallSessionController::class, 'touch'])
        ->whereNumber('classroom')
        ->middleware('throttle:240,1')
        ->name('call.session.touch');

    Route::post('classes/{classroom}/call/session/leave', [CallSessionController::class, 'leave'])
        ->whereNumber('classroom')
        ->middleware('throttle:60,1')
        ->name('call.session.leave');

    Route::post('classes/{classroom}/call/session/restart', [CallSessionController::class, 'restart'])
        ->whereNumber('classroom')
        ->middleware('throttle:30,1')
        ->name('call.session.restart');

    // The instructor's deliberate End class. Nothing else closes a session.
    Route::post('classes/{classroom}/call/session/end', [CallSessionController::class, 'end'])
        ->whereNumber('classroom')
        ->middleware('throttle:30,1')
        ->name('call.session.end');

    // Live polls belong to one open class session: the timer, the answers and
    // the results all disappear from the room when the class ends.
    Route::get('classes/{classroom}/call/polls', [PollController::class, 'index'])
        ->whereNumber('classroom')
        ->middleware('throttle:240,1')
        ->name('call.polls.index');

    Route::post('classes/{classroom}/call/polls', [PollController::class, 'store'])
        ->whereNumber('classroom')
        ->middleware('throttle:30,1')
        ->name('call.polls.store');

    Route::post('classes/{classroom}/call/polls/{poll}/respond', [PollController::class, 'respond'])
        ->whereNumber(['classroom', 'poll'])
        ->middleware('throttle:60,1')
        ->name('call.polls.respond');

    Route::post('classes/{classroom}/call/polls/{poll}/close', [PollController::class, 'close'])
        ->whereNumber(['classroom', 'poll'])
        ->middleware('throttle:30,1')
        ->name('call.polls.close');

    // Automatic attendance heartbeats and the instructor's remove control.
    Route::post('classes/{classroom}/call/attendance/{attendance}/ping', [CallAttendanceController::class, 'ping'])
        ->whereNumber(['classroom', 'attendance'])
        ->middleware('throttle:120,1')
        ->name('call.attendance.ping');

    Route::post('classes/{classroom}/call/attendance/{attendance}/leave', [CallAttendanceController::class, 'leave'])
        ->whereNumber(['classroom', 'attendance'])
        ->middleware('throttle:30,1')
        ->name('call.attendance.leave');

    Route::post('classes/{classroom}/call/participants/{identity}/remove', [CallModerationController::class, 'remove'])
        ->whereNumber('classroom')
        ->where('identity', '[A-Za-z0-9-]+')
        ->middleware('throttle:30,1')
        ->name('call.participants.remove');

    // The instructor's live microphone gate: runtime permission only, never
    // written to the database or carried into the next call.
    Route::post('classes/{classroom}/call/participants/{identity}/permission', [CallModerationController::class, 'permission'])
        ->whereNumber('classroom')
        ->where('identity', '[A-Za-z0-9-]+')
        ->middleware('throttle:60,1')
        ->name('call.participants.permission');

    // Shared board: the surface, the page and this room's ink.
    Route::patch('classes/{classroom}/board', [BoardController::class, 'update'])
        ->whereNumber('classroom')
        ->middleware('throttle:240,1')
        ->name('board.update');

    // The class PDF library: uploads stay attached to the class and can be
    // put back on the board without uploading them again.
    Route::post('classes/{classroom}/board/document', [BoardDocumentController::class, 'store'])
        ->whereNumber('classroom')
        ->name('board.document.store');

    Route::delete('classes/{classroom}/board/document', [BoardDocumentController::class, 'destroy'])
        ->whereNumber('classroom')
        ->name('board.document.destroy');

    Route::post('classes/{classroom}/board/documents/{document}/present', [BoardDocumentController::class, 'present'])
        ->whereNumber(['classroom', 'document'])
        ->name('board.documents.present');

    Route::get('classes/{classroom}/board/documents/{document}', [BoardDocumentController::class, 'show'])
        ->whereNumber(['classroom', 'document'])
        ->name('board.documents.show');

    // Alias for the PDF currently on the board (older links/bookmarks).
    Route::get('classes/{classroom}/board/document', [BoardDocumentController::class, 'current'])
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

// The class question board. Both students and instructors take part, but
// never administrators and never someone outside the room.
Route::middleware(['auth', 'role:student,instructor'])
    ->group(base_path('routes/questions.php'));
