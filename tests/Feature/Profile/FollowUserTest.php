<?php

use App\Models\User;

it('allows a user to follow another user', function () {
    $follower = User::factory()->create();
    $followed = User::factory()->create();

    $this->actingAs($follower)
        ->post(route('profiles.follow', $followed))
        ->assertRedirect();

    expect($follower->following()->whereKey($followed->id)->exists())->toBeTrue();
});

it('allows a user to unfollow another user', function () {
    $follower = User::factory()->create();
    $followed = User::factory()->create();

    $follower->following()->attach($followed->id);

    $this->actingAs($follower)
        ->delete(route('profiles.unfollow', $followed))
        ->assertRedirect();

    expect($follower->following()->whereKey($followed->id)->exists())->toBeFalse();
});

it('prevents a user from following themselves', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profiles.follow', $user))
        ->assertForbidden();
});
