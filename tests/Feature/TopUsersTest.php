<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to login', function () {
    $this->get(route('top-users.index'))->assertRedirect(route('login'));
});

test('it shows the top 10 users by followers', function () {
    $viewer = User::factory()->create();
    $followers = User::factory()->count(12)->create();
    $users = User::factory()->count(12)->create();

    $users->each(function (User $user, int $index) use ($followers): void {
        $count = 12 - $index;

        $user->followers()->attach($followers->take($count)->pluck('id'));
    });

    $expected = $users->take(10)->values();

    $this->actingAs($viewer)
        ->get(route('top-users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('top-users/index')
            ->has('users', 10)
            ->where('users.0.id', $expected[0]->id)
            ->where('users.0.followers_count', 12)
            ->where('users.1.id', $expected[1]->id)
            ->where('users.9.id', $expected[9]->id)
            ->where('users.9.followers_count', 3)
        );
});

test('it filters top users by search term', function () {
    $viewer = User::factory()->create();
    $followers = User::factory()->count(2)->create();
    $matches = User::factory()
        ->count(12)
        ->sequence(fn ($sequence) => [
            'name' => 'Jane '.$sequence->index,
            'email' => 'jane'.$sequence->index.'@example.com',
        ])
        ->create();
    User::factory()->create([
        'name' => 'Other User',
        'email' => 'other@example.com',
    ]);

    $matches->each(function (User $user) use ($followers): void {
        $user->followers()->attach($followers->pluck('id'));
    });

    $this->actingAs($viewer)
        ->get(route('top-users.index', ['search' => 'Jane']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('top-users/index')
            ->has('users', 12)
            ->where('filters.search', 'Jane')
        );
});
