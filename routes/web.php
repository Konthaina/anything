<?php

use App\Http\Controllers\CommentController;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TopUsersController;
use App\Http\Controllers\UserProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

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
    Route::post('feed/{post}/share', [FeedController::class, 'share'])->name('feed.share');
    Route::post('feed/{post}/comments', [CommentController::class, 'store'])->name('comments.store');
    Route::delete('feed/{post}', [FeedController::class, 'destroy'])->name('feed.destroy');
    Route::get('top-users', [TopUsersController::class, 'index'])->name('top-users.index');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::get('profiles', [UserProfileController::class, 'index'])->name('profiles.index');
    Route::get('profiles/{user}', [UserProfileController::class, 'show'])->name('profiles.show');
    Route::post('profiles/{user}/follow', [FollowController::class, 'follow'])->name('profiles.follow');
    Route::delete('profiles/{user}/follow', [FollowController::class, 'unfollow'])->name('profiles.unfollow');
});

require __DIR__.'/settings.php';
