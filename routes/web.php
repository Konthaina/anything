<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\CommentController;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('feed', [FeedController::class, 'index'])->name('feed.index');
    Route::post('feed', [FeedController::class, 'store'])->name('feed.store');
    Route::put('feed/{post}', [FeedController::class, 'update'])->name('feed.update');
    Route::post('feed/{post}/like', [FeedController::class, 'toggleLike'])->name('feed.like');
    Route::post('feed/{post}/comments', [CommentController::class, 'store'])->name('comments.store');
    Route::delete('feed/{post}', [FeedController::class, 'destroy'])->name('feed.destroy');
});

require __DIR__.'/settings.php';
