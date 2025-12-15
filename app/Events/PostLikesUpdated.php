<?php

namespace App\Events;

use App\Models\Post;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PostLikesUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public readonly Post $post)
    {
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
        return 'PostLikesUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'post_id' => $this->post->id,
            'likes_count' => $this->post->likes_count ?? 0,
        ];
    }
}
