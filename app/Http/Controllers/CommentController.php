<?php

namespace App\Http\Controllers;

use App\Events\PostCommentCreated;
use App\Models\Comment;
use App\Models\Post;
use App\Notifications\CommentRepliedNotification;
use App\Notifications\PostCommentedNotification;
use App\Support\FeedCommentPresenter;
use App\Support\NotificationDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommentController extends Controller
{
    public function store(Request $request, Post $post): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate(
            [
                'content' => ['required', 'string', 'max:1000', 'not_regex:/^\s*$/'],
                'parent_id' => ['nullable', 'integer'],
            ],
            [
                'content.not_regex' => 'The comment cannot be empty.',
            ]
        );

        $parentId = $data['parent_id'] ?? null;

        if ($parentId !== null) {
            $parentComment = Comment::query()
                ->where('post_id', $post->id)
                ->whereNull('parent_id')
                ->findOrFail($parentId);

            $parentId = $parentComment->id;
        }

        $comment = null;

        DB::transaction(function () use ($post, $user, $data, $parentId, &$comment) {
            $comment = $post->comments()->create([
                'user_id' => $user->id,
                'content' => trim($data['content']),
                'parent_id' => $parentId,
            ]);

            $post->increment('comments_count');
        });

        $post->refresh();

        if ($comment) {
            $comment
                ->load('user:id,name,email,avatar_path', 'parent.user:id,name,email,avatar_path')
                ->setRelation('replies', collect());

            event(new PostCommentCreated($post, $comment));

            if ($post->user_id !== $user->id) {
                $post->loadMissing('user');
                NotificationDispatcher::send($post->user, new PostCommentedNotification($post, $comment, $user));
            }

            if ($comment->parent && $comment->parent->user_id !== $user->id) {
                $comment->parent->loadMissing('user');
                NotificationDispatcher::send(
                    $comment->parent->user,
                    new CommentRepliedNotification($comment->parent, $comment, $user),
                );
            }
        }

        if ($request->expectsJson()) {
            if (! $comment) {
                return response()->json([
                    'message' => 'Unable to create the comment.',
                ], 500);
            }

            return response()->json([
                'post_id' => $post->id,
                'comments_count' => $post->comments_count,
                'comment' => FeedCommentPresenter::present($comment),
            ]);
        }

        return back();
    }
}
