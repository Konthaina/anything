<?php

namespace App\Http\Controllers;

use App\Events\PostCreated;
use App\Events\PostDeleted;
use App\Events\PostLikesUpdated;
use App\Events\PostShared;
use App\Events\PostUpdated;
use App\Http\Requests\SharePostRequest;
use App\Http\Requests\StorePostRequest;
use App\Http\Requests\UpdatePostRequest;
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
        $followingIds = $user
            ? $user->following()->pluck('users.id')->sort()->values()->all()
            : [];
        $posts = Post::query()
            ->when($user, function ($query) use ($user) {
                $query->where(function ($visibilityQuery) use ($user) {
                    $visibilityQuery
                        ->where('visibility', 'public')
                        ->orWhere('user_id', $user->id)
                        ->orWhereExists(function ($followerQuery) use ($user) {
                            $followerQuery
                                ->selectRaw('1')
                                ->from('user_followers')
                                ->whereColumn('user_followers.following_id', 'posts.user_id')
                                ->where('user_followers.follower_id', $user->id);
                        });
                });
            })
            ->with([
                'user:id,name,email,avatar_path,is_verified',
                'sharedPost.user:id,name,email,avatar_path,is_verified',
                'rootComments' => function ($query) {
                    $query
                        ->with([
                            'user:id,name,email,avatar_path,is_verified',
                            'replies' => function ($replyQuery) {
                                $replyQuery
                                    ->with('user:id,name,email,avatar_path,is_verified')
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
            'following_ids' => $followingIds,
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

    public function share(SharePostRequest $request, Post $post): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validated();

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
                'visibility' => $shareTarget->visibility ?? 'public',
                'image_paths' => [],
                'video_path' => null,
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
        $sharedPost->load(
            'user:id,name,email,avatar_path,is_verified',
            'sharedPost.user:id,name,email,avatar_path,is_verified',
        );

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

    public function store(StorePostRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $imagePaths = $this->storeUploadedImages($this->gatherUploadedFiles($request->file('images')));
        $videoPath = $this->storeUploadedVideo($request->file('video'));

        $post = $request->user()->posts()->create([
            'content' => $data['content'],
            'visibility' => $data['visibility'],
            'image_paths' => $imagePaths,
            'video_path' => $videoPath,
            'likes_count' => 0,
            'comments_count' => 0,
            'shares_count' => 0,
        ]);

        event(new PostCreated($post));

        return back();
    }

    public function update(UpdatePostRequest $request, Post $post): RedirectResponse
    {
        $data = $request->validated();

        $imagePaths = $post->image_paths ?? [];
        $videoPath = $post->video_path;

        if ($request->boolean('remove_image')) {
            $this->deleteStoredImages($imagePaths);
            $imagePaths = [];
        }

        if ($request->boolean('remove_video')) {
            $this->deleteStoredVideo($videoPath);
            $videoPath = null;
        }

        $uploadedFiles = $this->gatherUploadedFiles($request->file('images'));
        $uploadedVideo = $request->file('video');

        if (! empty($uploadedFiles)) {
            $this->deleteStoredImages($imagePaths);
            $imagePaths = $this->storeUploadedImages($uploadedFiles);
        }

        if ($uploadedVideo instanceof UploadedFile) {
            $this->deleteStoredVideo($videoPath);
            $videoPath = $this->storeUploadedVideo($uploadedVideo);
        }

        $post->update([
            'content' => $data['content'],
            'image_paths' => $imagePaths,
            'video_path' => $videoPath,
            'visibility' => $data['visibility'],
        ]);

        $post->refresh();

        event(new PostUpdated($post));

        return back();
    }

    public function destroy(Request $request, Post $post): RedirectResponse
    {
        abort_unless($request->user()->id === $post->user_id, 403);

        $this->deleteStoredImages($post->image_paths ?? []);
        $this->deleteStoredVideo($post->video_path);

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

    private function storeUploadedVideo(?UploadedFile $file): ?string
    {
        if (! $file) {
            return null;
        }

        return $file->store('posts/videos', 'public');
    }

    private function deleteStoredImages(array $paths): void
    {
        foreach ($paths as $path) {
            $this->deleteStoredImage($path);
        }
    }

    private function deleteStoredImage(?string $path): void
    {
        $this->deleteStoredPath($path);
    }

    private function deleteStoredVideo(?string $path): void
    {
        $this->deleteStoredPath($path);
    }

    private function deleteStoredPath(?string $path): void
    {
        if (! $path || Str::startsWith($path, ['http://', 'https://'])) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
