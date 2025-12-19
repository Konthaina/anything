<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('admin can verify a user', function () {
    $permission = Permission::query()->create([
        'name' => 'Manage users',
        'slug' => 'manage-users',
    ]);
    $role = Role::query()->create([
        'name' => 'User Manager',
        'slug' => 'user-manager',
    ]);
    $role->permissions()->attach($permission->id);

    $admin = User::factory()->create();
    $admin->roles()->attach($role->id);

    $user = User::factory()->create([
        'is_verified' => false,
    ]);

    $this
        ->actingAs($admin)
        ->from(route('admin.index', absolute: false))
        ->patch(route('admin.users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'is_verified' => true,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('admin.index', absolute: false));

    expect($user->refresh()->is_verified)->toBeTrue();
});
