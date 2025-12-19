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

    $profilePost = Post::factory()->for($profileUser)->create([
        'visibility' => 'public',
    ]);
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
            ->where('posts.data.0.user.id', $profileUser->id)
        );
});

it('limits follower-only posts on profiles', function () {
    $author = User::factory()->create();
    $follower = User::factory()->create();
    $stranger = User::factory()->create();

    $publicPost = Post::factory()->for($author)->create([
        'visibility' => 'public',
    ]);
    Post::factory()->for($author)->create([
        'visibility' => 'followers',
    ]);

    $author->followers()->attach($follower->id);

    $this->actingAs($follower)
        ->get(route('profiles.show', $author))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts.data', 2)
        );

    $this->actingAs($stranger)
        ->get(route('profiles.show', $author))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts.data', 1)
            ->where('posts.data.0.id', $publicPost->id)
        );
});

it('counts profile posts based on visibility for the viewer', function () {
    $author = User::factory()->create();
    Post::factory()->for($author)->create([
        'visibility' => 'public',
    ]);
    Post::factory()->for($author)->create([
        'visibility' => 'followers',
    ]);

    $stranger = User::factory()->create();
    $this->actingAs($stranger)
        ->get(route('profiles.show', $author))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('profile_user.posts_count', 1)
        );

    $follower = User::factory()->create();
    $author->followers()->attach($follower->id);

    $this->actingAs($follower)
        ->get(route('profiles.show', $author))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('profile_user.posts_count', 2)
        );
});
