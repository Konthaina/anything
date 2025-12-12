<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FeedController extends Controller
{
    public function index(): Response
    {
        $posts = Post::query()
            ->with(['user:id,name,email,avatar_path'])
            ->latest()
            ->get()
            ->map(function (Post $post) {
                return [
                    'id' => $post->id,
                    'content' => $post->content,
                    'image_url' => $post->image_url,
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
                ];
            })
            ->values();

        return Inertia::render('feed/index', [
            'posts' => $posts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'max:5120'],
        ]);

        $imagePath = null;

        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('posts', 'public');
        }

        $request->user()->posts()->create([
            'content' => $data['content'],
            'image_path' => $imagePath,
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
            'image' => ['nullable', 'image', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
        ]);

        $imagePath = $post->image_path;

        if ($request->boolean('remove_image')) {
            $this->deleteStoredImage($imagePath);
            $imagePath = null;
        }

        if ($request->hasFile('image')) {
            $this->deleteStoredImage($imagePath);
            $imagePath = $request->file('image')->store('posts', 'public');
        }

        $post->update([
            'content' => $data['content'],
            'image_path' => $imagePath,
        ]);

        return back();
    }

    public function destroy(Request $request, Post $post): RedirectResponse
    {
        abort_unless($request->user()->id === $post->user_id, 403);

        $this->deleteStoredImage($post->image_path);

        $post->delete();

        return back();
    }

    private function deleteStoredImage(?string $path): void
    {
        if (! $path || Str::startsWith($path, ['http://', 'https://'])) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
