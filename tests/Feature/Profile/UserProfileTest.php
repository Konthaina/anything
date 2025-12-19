<?php

use App\Models\Post;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('shows a user profile with their posts', function () {
    $viewer = User::factory()->create();
    $profileUser = User::factory()->create([
        'bio' => 'Loves building Laravel apps.',
    ]);
    $follower = User::factory()->create();
    $followed = User::factory()->create();

    $profilePost = Post::factory()->for($profileUser)->create();
    Post::factory()->create();

    $profileUser->followers()->attach($follower->id);
    $profileUser->following()->attach($followed->id);

    $this->actingAs($viewer)
        ->get(route('profiles.show', $profileUser))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('profiles/show')
            ->where('profile_user.id', $profileUser->id)
            ->where('profile_user.name', $profileUser->name)
            ->where('profile_user.bio', $profileUser->bio)
            ->where('profile_user.posts_count', 1)
            ->where('profile_user.followers_count', 1)
            ->where('profile_user.following_count', 1)
            ->has('posts.data', 1)
            ->where('posts.data.0.id', $profilePost->id)
        );
});
