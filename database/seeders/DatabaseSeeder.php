<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Post;
use App\Models\Comment;
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

        $featuredPosts = Post::factory(5)
            ->for($admin)
            ->create([
                'content' => 'Just wrapped up an amazing brainstorming session with the team! The energy was incredible and we came up with some truly innovative ideas for the upcoming community guidelines.',
                'image_paths' => ['https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'],
                'likes_count' => 42,
                'shares_count' => 3,
            ]);

        $additionalPosts = Post::factory(10)->create();

        $this->seedCommentsForPosts($featuredPosts->concat($additionalPosts));
    }

    private function seedCommentsForPosts($posts): void
    {
        $users = User::all();

        $posts->each(function (Post $post) use ($users) {
            $commentTotal = fake()->numberBetween(0, 4);

            $comments = Comment::factory($commentTotal)
                ->for($post)
                ->state(fn () => [
                    'user_id' => $users->random()->id,
                ])
                ->create();

            foreach ($comments as $comment) {
                $replyTotal = fake()->boolean(55) ? fake()->numberBetween(0, 2) : 0;

                if ($replyTotal === 0) {
                    continue;
                }

                Comment::factory($replyTotal)
                    ->for($post)
                    ->state(fn () => [
                        'user_id' => $users->random()->id,
                        'parent_id' => $comment->id,
                    ])
                    ->create();
            }

            $post->update([
                'comments_count' => $post->comments()->count(),
            ]);
        });
    }
}
