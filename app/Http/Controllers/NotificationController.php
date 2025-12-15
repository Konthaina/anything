<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function markAllRead(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user) {
            $user->unreadNotifications->markAsRead();
        }

        return back()->with('status', 'notifications-read');
    }
}
