<?php

namespace App\Support;

use App\Models\Comment;
use App\Models\Post;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class FeedPostPresenter
{
    public static function present(Post $post, array $lookups = [], bool $includeSharedPost = true): array
    {
        $likedLookup = $lookups['liked'] ?? [];
        $sharedLookup = $lookups['shared'] ?? [];

        $post->loadMissing([
            'user:id,name,email,avatar_path,is_verified',
            'sharedPost.user:id,name,email,avatar_path,is_verified',
            'rootComments' => static function (HasMany $query): void {
                $query
                    ->with([
                        'user:id,name,email,avatar_path,is_verified',
                        'replies' => static function (HasMany $replyQuery): void {
                            $replyQuery
                                ->with('user:id,name,email,avatar_path,is_verified')
                                ->orderBy('created_at');
                        },
                    ])
                    ->orderBy('created_at');
            },
        ]);

        $rootComments = $post->relationLoaded('rootComments')
            ? $post->rootComments
            : Collection::make();

        return [
            'id' => $post->id,
            'content' => $post->content,
            'visibility' => $post->visibility ?? 'public',
            'image_urls' => $post->image_urls,
            'likes_count' => $post->likes_count ?? 0,
            'comments_count' => $post->comments_count ?? 0,
            'shares_count' => $post->shares_count ?? 0,
            'created_at' => $post->created_at,
            'user' => [
                'id' => $post->user->id,
                'name' => $post->user->name,
                'email' => $post->user->email,
                'avatar' => $post->user->avatar,
                'is_verified' => (bool) $post->user->is_verified,
            ],
            'liked' => (bool) ($likedLookup[$post->id] ?? false),
            'shared' => (bool) ($sharedLookup[$post->id] ?? false),
            'shared_post' => $includeSharedPost && $post->sharedPost
                ? self::presentShared($post->sharedPost, $lookups)
                : null,
            'comments' => $rootComments
                ->map(fn (Comment $comment) => FeedCommentPresenter::present($comment))
                ->values(),
        ];
    }

    private static function presentShared(Post $post, array $lookups): array
    {
        return self::present($post, $lookups, includeSharedPost: false);
    }
}
