<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Post;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory(10)->create();

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
            'manage-appearance' => 'Manage appearance',
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

        Post::factory(5)
            ->for($admin)
            ->create([
                'content' => 'Just wrapped up an amazing brainstorming session with the team! The energy was incredible and we came up with some truly innovative ideas for the upcoming community guidelines.',
                'image_paths' => ['https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'],
                'likes_count' => 42,
                'comments_count' => 12,
                'shares_count' => 3,
            ]);

        Post::factory(10)->create();
    }
}
