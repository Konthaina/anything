<?php

namespace App\Events;

use App\Support\NotificationPresenter;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Queue\SerializesModels;

class UserNotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly DatabaseNotification $notification,
    ) {
        //
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("notifications.{$this->notification->notifiable_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'UserNotificationCreated';
    }

    public function broadcastWith(): array
    {
        return [
            'notification' => NotificationPresenter::present($this->notification),
        ];
    }
}
