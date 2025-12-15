<?php

namespace App\Support;

use App\Models\Comment;
use Illuminate\Support\Collection;

class FeedCommentPresenter
{
    public static function present(Comment $comment): array
    {
        $comment->loadMissing('user:id,name,email,avatar_path');

        $replies = $comment->relationLoaded('replies')
            ? $comment->replies
            : Collection::make();

        return [
            'id' => $comment->id,
            'content' => $comment->content,
            'created_at' => $comment->created_at,
            'parent_id' => $comment->parent_id,
            'user' => [
                'id' => $comment->user->id,
                'name' => $comment->user->name,
                'email' => $comment->user->email,
                'avatar' => $comment->user->avatar,
            ],
            'replies' => $replies
                ->map(fn (Comment $reply) => self::present($reply))
                ->values(),
        ];
    }
}
