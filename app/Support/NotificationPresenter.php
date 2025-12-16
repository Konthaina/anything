<?php

namespace App\Support;

use Illuminate\Notifications\DatabaseNotification;

class NotificationPresenter
{
    public static function present(DatabaseNotification $notification): array
    {
        $data = $notification->data ?? [];

        return [
            'id' => $notification->id,
            'type' => $data['type'] ?? 'info',
            'message' => self::formatMessage($data),
            'data' => $data,
            'created_at' => $notification->created_at?->toIso8601String(),
            'read_at' => $notification->read_at?->toIso8601String(),
        ];
    }

    private static function formatMessage(array $data): string
    {
        $actor = $data['actor']['name'] ?? 'Someone';

        return match ($data['type'] ?? null) {
            'post_liked' => "{$actor} liked your post",
            'post_unliked' => "{$actor} unliked your post",
            'post_commented' => "{$actor} commented on your post",
            'comment_replied' => "{$actor} replied to your comment",
            'post_shared' => "{$actor} shared your post",
            default => "{$actor} interacted with you",
        };
    }
}
