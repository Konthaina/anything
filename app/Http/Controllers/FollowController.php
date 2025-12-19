<?php

namespace App\Http\Controllers;

use App\Http\Requests\FollowUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class FollowController extends Controller
{
    public function follow(FollowUserRequest $request, User $user): RedirectResponse
    {
        $request->user()->following()->syncWithoutDetaching([$user->id]);

        return back();
    }

    public function unfollow(FollowUserRequest $request, User $user): RedirectResponse
    {
        $request->user()->following()->detach($user->id);

        return back();
    }
}
