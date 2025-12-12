<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    protected $model = Post::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'content' => fake()->paragraphs(2, true),
            'image_path' => fake()->boolean(60)
                ? 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'
                : null,
            'likes_count' => fake()->numberBetween(4, 120),
            'comments_count' => fake()->numberBetween(0, 20),
            'shares_count' => fake()->numberBetween(0, 12),
        ];
    }
}
