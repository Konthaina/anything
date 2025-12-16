<?php

use App\Events\PostCreated;
use App\Events\PostDeleted;
use App\Events\PostUpdated;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Event;

it('broadcasts a PostCreated event when a user creates a post', function () {
    Event::fake([PostCreated::class]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.store'), [
            'content' => 'Realtime feed rocks',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    Event::assertDispatched(PostCreated::class, function (PostCreated $event) use ($user) {
        return $event->post->user_id === $user->id
            && $event->post->content === 'Realtime feed rocks';
    });
});

it('broadcasts a PostUpdated event when a user edits a post', function () {
    Event::fake([PostUpdated::class]);

    $user = User::factory()->create();
    $post = Post::factory()->for($user)->create([
        'content' => 'Original content',
    ]);

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->put(route('feed.update', $post), [
            'content' => 'Updated content',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    Event::assertDispatched(PostUpdated::class, function (PostUpdated $event) use ($post) {
        return $event->post->id === $post->id
            && $event->post->content === 'Updated content';
    });
});

it('broadcasts a PostDeleted event when a user deletes a post', function () {
    Event::fake([PostDeleted::class]);

    $user = User::factory()->create();
    $post = Post::factory()->for($user)->create();

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->delete(route('feed.destroy', $post))
        ->assertRedirect(route('feed.index', absolute: false));

    Event::assertDispatched(PostDeleted::class, fn (PostDeleted $event) => $event->postId === $post->id);
});
