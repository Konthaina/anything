<?php

namespace App\Notifications;

use App\Models\Post;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class PostUnlikedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Post $post,
        public readonly User $actor,
    ) {
        //
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'post_unliked',
            'post_id' => $this->post->id,
            'post_excerpt' => Str::limit($this->post->content ?? '', 120),
            'actor' => [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
                'avatar' => $this->actor->avatar,
            ],
        ];
    }
}
