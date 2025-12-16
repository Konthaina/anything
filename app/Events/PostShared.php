<?php

namespace App\Events;

use App\Models\Post;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PostShared implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly Post $post,
        public readonly ?User $actor = null,
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
        return 'PostShared';
    }

    public function broadcastWith(): array
    {
        return [
            'post_id' => $this->post->id,
            'shares_count' => $this->post->shares_count ?? 0,
            'shared_by' => $this->actor?->id,
        ];
    }
}
