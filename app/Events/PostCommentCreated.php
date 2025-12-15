<?php

namespace App\Events;

use App\Models\Comment;
use App\Models\Post;
use App\Support\FeedCommentPresenter;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PostCommentCreated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly Post $post,
        public readonly Comment $comment,
    ) {
        //
    }

    public function broadcastOn(): array
    {
        return [
            new Channel("posts.{$this->post->id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'PostCommentCreated';
    }

    public function broadcastWith(): array
    {
        return [
            'post_id' => $this->post->id,
            'comments_count' => $this->post->comments_count ?? 0,
            'comment' => FeedCommentPresenter::present($this->comment),
        ];
    }
}
