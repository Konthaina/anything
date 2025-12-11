<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\AppearanceController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use App\Http\Controllers\Settings\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/appearance', [AppearanceController::class, 'edit'])->name('appearance.edit');
    Route::patch('settings/appearance', [AppearanceController::class, 'update'])->name('appearance.update');

    Route::middleware('can.manage-users')->prefix('settings/admin')->name('admin.')->group(function () {
        Route::get('/', [UserManagementController::class, 'index'])->name('index');
        Route::post('roles', [UserManagementController::class, 'storeRole'])->name('roles.store');
        Route::post('permissions', [UserManagementController::class, 'storePermission'])->name('permissions.store');
        Route::post('users', [UserManagementController::class, 'storeUser'])->name('users.store');
        Route::patch('users/{user}', [UserManagementController::class, 'updateUser'])->name('users.update');
        Route::patch('users/{user}/roles', [UserManagementController::class, 'updateUserRoles'])->name('users.roles');
        Route::delete('users/{user}', [UserManagementController::class, 'destroyUser'])->name('users.destroy');
        Route::patch('roles/{role}/permissions', [UserManagementController::class, 'updateRolePermissions'])->name('roles.permissions');
    });

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');
});
