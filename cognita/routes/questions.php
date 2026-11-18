<?php

declare(strict_types=1);

use App\Http\Controllers\AnswerController;
use App\Http\Controllers\PostMediaController;
use App\Http\Controllers\QuestionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Community feed
|--------------------------------------------------------------------------
|
| Every signed-in learner can read posts, answer and vote. Posting into a group
| requires membership; general posts are open to everyone.
|
*/

Route::get('questions', [QuestionController::class, 'index'])
    ->name('questions.index');

Route::post('questions', [QuestionController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('questions.store');

Route::get('questions/media/{media}', [PostMediaController::class, 'show'])
    ->whereNumber('media')
    ->name('questions.media.show');

Route::get('questions/{question}', [QuestionController::class, 'show'])
    ->whereNumber('question')
    ->name('questions.show');

Route::post('questions/{question}/vote', [QuestionController::class, 'vote'])
    ->whereNumber('question')
    ->middleware('throttle:120,1')
    ->name('questions.vote');

Route::post('questions/{question}/answers', [AnswerController::class, 'store'])
    ->whereNumber('question')
    ->middleware('throttle:30,1')
    ->name('questions.answers.store');

Route::post('answers/{answer}/vote', [AnswerController::class, 'vote'])
    ->whereNumber('answer')
    ->middleware('throttle:120,1')
    ->name('answers.vote');

Route::post('answers/{answer}/accept', [AnswerController::class, 'accept'])
    ->whereNumber('answer')
    ->middleware('throttle:60,1')
    ->name('answers.accept');
