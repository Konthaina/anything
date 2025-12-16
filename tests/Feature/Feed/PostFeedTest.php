<?php

use App\Events\PostCreated;
use App\Events\PostDeleted;
use App\Events\PostShared;
use App\Events\PostUpdated;
use App\Models\Post;
use App\Models\User;
use App\Notifications\PostSharedNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;

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

it('broadcasts a PostShared event when a user shares a post', function () {
    Event::fake([PostShared::class]);

    $author = User::factory()->create();
    $user = User::factory()->create();
    $post = Post::factory()->for($author)->create([
        'shares_count' => 0,
    ]);

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $post))
        ->assertRedirect(route('feed.index', absolute: false));

    expect(Post::query()->where('shared_post_id', $post->id)->where('user_id', $user->id)->count())->toBe(1);
    expect($post->refresh()->shares_count)->toBe(1);

    Event::assertDispatched(PostShared::class, function (PostShared $event) use ($post, $user) {
        return $event->post->id === $post->id
            && $event->actor?->id === $user->id
            && $event->post->shares_count === 1;
    });
});

it('notifies the post owner when someone else shares their post', function () {
    Notification::fake();

    $author = User::factory()->create();
    $sharer = User::factory()->create();
    $post = Post::factory()->for($author)->create();

    $this->actingAs($sharer)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $post))
        ->assertRedirect(route('feed.index', absolute: false));

    Notification::assertSentTo(
        $author,
        PostSharedNotification::class,
        function (PostSharedNotification $notification) use ($post, $sharer) {
            return $notification->post->is($post)
                && $notification->actor->is($sharer);
        },
    );
});

it('shares the original post when resharing an existing share', function () {
    Event::fake([PostShared::class]);

    $author = User::factory()->create();
    $original = Post::factory()->for($author)->create();

    $firstSharer = User::factory()->create();
    $sharedPost = Post::factory()->for($firstSharer)->create([
        'shared_post_id' => $original->id,
    ]);

    $secondSharer = User::factory()->create();

    $this->actingAs($secondSharer)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $sharedPost))
        ->assertRedirect(route('feed.index', absolute: false));

    expect(Post::query()->where('shared_post_id', $original->id)->where('user_id', $secondSharer->id)->exists())->toBeTrue();

    Event::assertDispatched(PostShared::class, function (PostShared $event) use ($original, $secondSharer) {
        return $event->post->id === $original->id
            && $event->actor?->id === $secondSharer->id;
    });
});

it('does not allow the same user to share the same post twice', function () {
    $author = User::factory()->create();
    $user = User::factory()->create();
    $post = Post::factory()->for($author)->create();

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $post))
        ->assertRedirect(route('feed.index', absolute: false));

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $post))
        ->assertSessionHasErrors(['share']);

    expect(Post::query()->where('shared_post_id', $post->id)->where('user_id', $user->id)->count())->toBe(1);
});
