<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class CommentRepliedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Comment $parentComment,
        public readonly Comment $reply,
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
            'type' => 'comment_replied',
            'post_id' => $this->reply->post_id,
            'comment_id' => $this->reply->id,
            'parent_comment_id' => $this->parentComment->id,
            'reply_excerpt' => Str::limit($this->reply->content ?? '', 140),
            'parent_excerpt' => Str::limit($this->parentComment->content ?? '', 140),
            'actor' => [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
                'avatar' => $this->actor->avatar,
            ],
        ];
    }
}
