<?php

declare(strict_types=1);

use App\Http\Controllers\Community\PostController;
use App\Http\Controllers\Community\ThreadController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Community routes (only mounted when features.social=true)
|--------------------------------------------------------------------------
| The group already supplies ['auth:sanctum', 'active'] and the 'community'
| prefix/name.
*/

// Threads.
Route::get('threads', [ThreadController::class, 'index'])->name('threads.index');
Route::post('threads', [ThreadController::class, 'store'])->name('threads.store');
Route::get('threads/{thread}', [ThreadController::class, 'show'])->name('threads.show');
Route::patch('threads/{thread}', [ThreadController::class, 'update'])->name('threads.update');

// Posts. Post URIs stay flat because a post is globally addressable by id.
Route::post('threads/{thread}/posts', [PostController::class, 'store'])->name('threads.posts.store');
Route::patch('posts/{post}', [PostController::class, 'update'])->name('posts.update');
Route::delete('posts/{post}', [PostController::class, 'destroy'])->name('posts.destroy');
