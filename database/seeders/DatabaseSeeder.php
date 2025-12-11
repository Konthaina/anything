<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );

        $adminRole = Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin']
        );

        $permissions = [
            'manage-users' => 'Manage users',
            'manage-roles' => 'Manage roles',
            'manage-permissions' => 'Manage permissions',
            'manage-all' => 'Manage all',
        ];

        $permissionIds = [];

        foreach ($permissions as $slug => $name) {
            $permissionIds[] = Permission::firstOrCreate(
                ['slug' => $slug],
                ['name' => $name]
            )->id;
        }

        $adminRole->permissions()->syncWithoutDetaching($permissionIds);
        $admin->roles()->syncWithoutDetaching([$adminRole->id]);
    }
}
