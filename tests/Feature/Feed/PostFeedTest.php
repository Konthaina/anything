<?php

use App\Events\PostCreated;
use App\Events\PostDeleted;
use App\Events\PostShared;
use App\Events\PostUpdated;
use App\Models\Post;
use App\Models\PostShare;
use App\Models\User;
use App\Notifications\PostSharedNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

it('renders the feed page with image urls', function () {
    $user = User::factory()->create();
    $followed = User::factory()->create();
    $post = Post::factory()->for($user)->create([
        'image_paths' => ['posts/example.png', 'posts/example-two.png'],
        'visibility' => 'public',
    ]);

    $user->forceFill(['is_verified' => true])->save();
    $user->following()->attach($followed->id);

    $this->actingAs($user)
        ->get(route('feed.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('feed/index')
            ->has('following_ids', 1)
            ->where('following_ids.0', $followed->id)
            ->has('posts.data', 1)
            ->where('posts.data.0.id', $post->id)
            ->where('posts.data.0.visibility', 'public')
            ->where('posts.data.0.user.is_verified', true)
            ->has('posts.data.0.image_urls', 2)
            ->where('posts.data.0.image_urls.0', Storage::disk('public')->url('posts/example.png'))
            ->where('posts.data.0.image_urls.1', Storage::disk('public')->url('posts/example-two.png'))
        );
});

it('shows follower-only posts to followers but not to non-followers', function () {
    $author = User::factory()->create();
    $follower = User::factory()->create();
    $stranger = User::factory()->create();

    $post = Post::factory()->for($author)->create([
        'visibility' => 'followers',
    ]);

    $author->followers()->attach($follower->id);

    $this->actingAs($follower)
        ->get(route('feed.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts.data', 1)
            ->where('posts.data.0.id', $post->id)
        );

    $this->actingAs($stranger)
        ->get(route('feed.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts.data', 0)
        );
});

it('broadcasts a PostCreated event when a user creates a post', function () {
    Event::fake([PostCreated::class]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.store'), [
            'content' => 'Realtime feed rocks',
            'visibility' => 'public',
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
            'visibility' => 'followers',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    Event::assertDispatched(PostUpdated::class, function (PostUpdated $event) use ($post) {
        return $event->post->id === $post->id
            && $event->post->content === 'Updated content'
            && $event->post->visibility === 'followers';
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
        ->post(route('feed.share', $post), [
            'content' => 'Check this out',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    expect(Post::query()->where('shared_post_id', $post->id)->where('user_id', $user->id)->value('content'))->toBe('Check this out');
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
        ->post(route('feed.share', $post), [
            'content' => 'Sharing your post',
        ])
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
        ->post(route('feed.share', $sharedPost), [
            'content' => 'Boosting this again',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    expect(Post::query()->where('shared_post_id', $original->id)->where('user_id', $secondSharer->id)->exists())->toBeTrue();

    Event::assertDispatched(PostShared::class, function (PostShared $event) use ($original, $secondSharer) {
        return $event->post->id === $original->id
            && $event->actor?->id === $secondSharer->id;
    });
});

it('increments share counts on both original and shared posts when resharing', function () {
    $author = User::factory()->create();
    $original = Post::factory()->for($author)->create([
        'content' => 'Original post',
        'shares_count' => 0,
    ]);

    $firstSharer = User::factory()->create();
    $this->actingAs($firstSharer)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $original), [
            'content' => 'Sharing once',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    $sharedPost = Post::query()
        ->where('shared_post_id', $original->id)
        ->where('user_id', $firstSharer->id)
        ->firstOrFail();

    expect($original->refresh()->shares_count)->toBe(1);
    expect($sharedPost->shares_count)->toBe(0);

    $secondSharer = User::factory()->create();
    $this->actingAs($secondSharer)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $sharedPost), [
            'content' => 'Sharing again',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    expect($original->refresh()->shares_count)->toBe(2);
    expect($sharedPost->refresh()->shares_count)->toBe(1);
});

it('allows the same user to share the same post multiple times', function () {
    $author = User::factory()->create();
    $user = User::factory()->create();
    $post = Post::factory()->for($author)->create([
        'shares_count' => 0,
    ]);

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $post), [
            'content' => 'First share',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    $this->actingAs($user)
        ->from(route('feed.index', absolute: false))
        ->post(route('feed.share', $post), [
            'content' => 'Second share',
        ])
        ->assertRedirect(route('feed.index', absolute: false));

    expect(Post::query()->where('shared_post_id', $post->id)->where('user_id', $user->id)->count())->toBe(2);
    expect(PostShare::query()->where('post_id', $post->id)->where('user_id', $user->id)->count())->toBe(2);
    expect($post->refresh()->shares_count)->toBe(2);
});
