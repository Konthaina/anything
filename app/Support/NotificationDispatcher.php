<?php

namespace App\Support;

use App\Events\UserNotificationCreated;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Notifications\Notification;

class NotificationDispatcher
{
    public static function send(?Authenticatable $notifiable, Notification $notification): ?DatabaseNotification
    {
        if (! $notifiable) {
            return null;
        }

        $notifiable->notify($notification);

        $databaseNotification = $notifiable->notifications()
            ->where('type', get_class($notification))
            ->latest('created_at')
            ->first();

        if ($databaseNotification instanceof DatabaseNotification) {
            event(new UserNotificationCreated($databaseNotification));
        }

        return $databaseNotification;
    }
}
