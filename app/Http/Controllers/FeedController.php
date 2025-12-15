<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Post;
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

    public function index(Request $request): Response
    {
        $user = $request->user();

        $likedPostIds = $user
            ? DB::table('post_likes')
                ->where('user_id', $user->id)
                ->pluck('post_id')
                ->all()
            : [];

        $likedLookup = array_fill_keys($likedPostIds, true);

        $posts = Post::query()
            ->with([
                'user:id,name,email,avatar_path',
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
            ->get()
            ->map(function (Post $post) use ($likedLookup) {
                return [
                    'id' => $post->id,
                    'content' => $post->content,
                    'image_urls' => $post->image_urls,
                    'likes_count' => $post->likes_count,
                    'comments_count' => $post->comments_count,
                    'shares_count' => $post->shares_count,
                    'created_at' => $post->created_at,
                    'user' => [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                        'email' => $post->user->email,
                        'avatar' => $post->user->avatar,
                    ],
                    'liked' => $likedLookup[$post->id] ?? false,
                    'comments' => $post->rootComments
                        ->map(fn (Comment $comment) => $this->transformComment($comment))
                        ->values(),
                ];
            })
            ->values();

        return Inertia::render('feed/index', [
            'posts' => $posts,
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
        } else {
            $post->likes()->create(['user_id' => $user->id]);
            $post->increment('likes_count');
        }

        return back();
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:' . self::MAX_IMAGES],
            'images.*' => ['image', 'max:5120'],
        ]);

        $imagePaths = $this->storeUploadedImages($this->gatherUploadedFiles($request->file('images')));

        $request->user()->posts()->create([
            'content' => $data['content'],
            'image_paths' => $imagePaths,
            'likes_count' => 0,
            'comments_count' => 0,
            'shares_count' => 0,
        ]);

        return back();
    }

    public function update(Request $request, Post $post): RedirectResponse
    {
        abort_unless($request->user()->id === $post->user_id, 403);

        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:' . self::MAX_IMAGES],
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

        return back();
    }

    public function destroy(Request $request, Post $post): RedirectResponse
    {
        abort_unless($request->user()->id === $post->user_id, 403);

        $this->deleteStoredImages($post->image_paths ?? []);

        $post->delete();

        return back();
    }

    private function transformComment(Comment $comment): array
    {
        return [
            'id' => $comment->id,
            'content' => $comment->content,
            'created_at' => $comment->created_at,
            'user' => [
                'id' => $comment->user->id,
                'name' => $comment->user->name,
                'email' => $comment->user->email,
                'avatar' => $comment->user->avatar,
            ],
            'replies' => $comment->replies
                ->map(fn (Comment $reply) => $this->transformComment($reply))
                ->values(),
        ];
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
