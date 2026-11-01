<?php

declare(strict_types=1);

use App\Http\Controllers\Student\HomeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Student routes (prefix: /my-classes, middleware: auth + role:student)
|--------------------------------------------------------------------------
| The home page is the class list plus the key form. Joining itself is handled
| by the public JoinController so the same key form works before and after
| sign-in.
|
*/

Route::get('/', [HomeController::class, 'index'])->name('home');
