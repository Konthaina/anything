<?php

namespace App\Http\Controllers;

use App\Events\PostCreated;
use App\Events\PostDeleted;
use App\Events\PostLikesUpdated;
use App\Events\PostShared;
use App\Events\PostUpdated;
use App\Models\Post;
use App\Models\PostLike;
use App\Models\PostShare;
use App\Notifications\PostLikedNotification;
use App\Notifications\PostSharedNotification;
use App\Notifications\PostUnlikedNotification;
use App\Support\FeedPostPresenter;
use App\Support\NotificationDispatcher;
use App\Support\NotificationPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FeedController extends Controller
{
    private const MAX_IMAGES = 7;

    private const POSTS_PER_PAGE = 10;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $posts = Post::query()
            ->with([
                'user:id,name,email,avatar_path',
                'sharedPost.user:id,name,email,avatar_path',
                'rootComments' => function ($query) {
                    $query
                        ->with([
                            'user:id,name,email,avatar_path',
                            'replies' => function ($replyQuery) {
                                $replyQuery
                                    ->with('user:id,name,email,avatar_path')
                                    ->orderBy('created_at');
                            },
                        ])
                        ->orderBy('created_at');
                },
            ])
            ->latest()
            ->paginate(self::POSTS_PER_PAGE);

        $lookupIds = $posts->getCollection()
            ->pluck('shared_post_id')
            ->filter()
            ->merge($posts->getCollection()->pluck('id'))
            ->unique()
            ->values();

        $likedLookup = [];
        $sharedLookup = [];

        if ($user && $lookupIds->isNotEmpty()) {
            $likedPostIds = PostLike::query()
                ->where('user_id', $user->id)
                ->whereIn('post_id', $lookupIds)
                ->pluck('post_id')
                ->all();

            $sharedPostIds = PostShare::query()
                ->where('user_id', $user->id)
                ->whereIn('post_id', $lookupIds)
                ->pluck('post_id')
                ->all();

            $likedLookup = array_fill_keys($likedPostIds, true);
            $sharedLookup = array_fill_keys($sharedPostIds, true);
        }

        $lookups = [
            'liked' => $likedLookup,
            'shared' => $sharedLookup,
        ];

        $posts->through(fn (Post $post) => FeedPostPresenter::present($post, $lookups));

        $notifications = $user
            ? $user->notifications()
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn ($notification) => NotificationPresenter::present($notification))
            : collect();

        $unreadCount = $user ? $user->unreadNotifications()->count() : 0;

        return Inertia::render('feed/index', [
            'posts' => Inertia::scroll($posts),
            'notifications' => $notifications,
            'notifications_unread_count' => $unreadCount,
        ]);
    }

    public function toggleLike(Request $request, Post $post): RedirectResponse
    {
        $user = $request->user();

        $existing = $post->likes()->where('user_id', $user->id);
        $wasLiked = $existing->exists();

        if ($wasLiked) {
            $existing->delete();
            $post->forceFill([
                'likes_count' => max(0, ($post->likes_count ?? 0) - 1),
            ])->save();

            if ($post->user_id !== $user->id) {
                $post->loadMissing('user');
                NotificationDispatcher::send($post->user, new PostUnlikedNotification($post, $user));
            }
        } else {
            $post->likes()->create(['user_id' => $user->id]);
            $post->increment('likes_count');

            if ($post->user_id !== $user->id) {
                $post->loadMissing('user');
                NotificationDispatcher::send($post->user, new PostLikedNotification($post, $user));
            }
        }

        $post->refresh();

        event(new PostLikesUpdated($post));

        return back();
    }

    public function share(Request $request, Post $post): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'content' => ['nullable', 'string', 'max:2000'],
        ]);

        $shareContent = trim((string) ($data['content'] ?? ''));

        $post->loadMissing('sharedPost');
        $shareTarget = $post->sharedPost ?? $post;
        $resharingSharedPost = ! $post->is($shareTarget);

        $sharedPost = null;

        DB::transaction(function () use ($shareTarget, $shareContent, $user, $post, $resharingSharedPost, &$sharedPost): void {
            $shareTarget->shares()->create([
                'user_id' => $user->id,
            ]);

            $shareTarget->increment('shares_count');
            if ($resharingSharedPost) {
                $post->increment('shares_count');
            }

            $sharedPost = $user->posts()->create([
                'content' => $shareContent,
                'image_paths' => [],
                'likes_count' => 0,
                'comments_count' => 0,
                'shares_count' => 0,
                'shared_post_id' => $shareTarget->id,
            ]);
        });

        if (! $sharedPost) {
            return back()->withErrors([
                'share' => __('Unable to share this post at the moment.'),
            ]);
        }

        $shareTarget->refresh();
        if ($resharingSharedPost) {
            $post->refresh();
        }
        $sharedPost->load('user:id,name,email,avatar_path', 'sharedPost.user:id,name,email,avatar_path');

        event(new PostCreated($sharedPost));
        event(new PostShared($shareTarget, $user));
        if ($resharingSharedPost) {
            event(new PostShared($post, $user));
        }

        if ($shareTarget->user_id !== $user->id) {
            $shareTarget->loadMissing('user');
            NotificationDispatcher::send($shareTarget->user, new PostSharedNotification($shareTarget, $user));
        }

        return back();
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'images.*' => ['image', 'max:5120'],
        ]);

        $imagePaths = $this->storeUploadedImages($this->gatherUploadedFiles($request->file('images')));

        $post = $request->user()->posts()->create([
            'content' => $data['content'],
            'image_paths' => $imagePaths,
            'likes_count' => 0,
            'comments_count' => 0,
            'shares_count' => 0,
        ]);

        event(new PostCreated($post));

        return back();
    }

    public function update(Request $request, Post $post): RedirectResponse
    {
        abort_unless($request->user()->id === $post->user_id, 403);

        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'images.*' => ['image', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
        ]);

        $imagePaths = $post->image_paths ?? [];

        if ($request->boolean('remove_image')) {
            $this->deleteStoredImages($imagePaths);
            $imagePaths = [];
        }

        $uploadedFiles = $this->gatherUploadedFiles($request->file('images'));

        if (! empty($uploadedFiles)) {
            $this->deleteStoredImages($imagePaths);
            $imagePaths = $this->storeUploadedImages($uploadedFiles);
        }

        $post->update([
            'content' => $data['content'],
            'image_paths' => $imagePaths,
        ]);

        $post->refresh();

        event(new PostUpdated($post));

        return back();
    }

    public function destroy(Request $request, Post $post): RedirectResponse
    {
        abort_unless($request->user()->id === $post->user_id, 403);

        $this->deleteStoredImages($post->image_paths ?? []);

        $postId = $post->id;

        $post->delete();

        event(new PostDeleted($postId));

        return back();
    }

    private function gatherUploadedFiles(array|UploadedFile|null $files): array
    {
        if ($files instanceof UploadedFile) {
            return [$files];
        }

        if (! is_array($files)) {
            return [];
        }

        return array_values(array_filter($files));
    }

    private function storeUploadedImages(array $files): array
    {
        $limited = array_slice($files, 0, self::MAX_IMAGES);

        return array_map(
            fn (UploadedFile $file) => $file->store('posts', 'public'),
            $limited,
        );
    }

    private function deleteStoredImages(array $paths): void
    {
        foreach ($paths as $path) {
            $this->deleteStoredImage($path);
        }
    }

    private function deleteStoredImage(?string $path): void
    {
        if (! $path || Str::startsWith($path, ['http://', 'https://'])) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
