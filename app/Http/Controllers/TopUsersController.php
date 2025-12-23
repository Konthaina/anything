<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TopUsersController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $query = User::query()
            ->select('id', 'name', 'email', 'avatar_path', 'is_verified')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($userQuery) use ($search) {
                    $userQuery
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%');
                });
            })
            ->withCount(['followers', 'posts'])
            ->orderByDesc('followers_count')
            ->orderByDesc('posts_count')
            ->orderBy('name');

        if ($search === '') {
            $query->limit(10);
        }

        $users = $query->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'is_verified' => (bool) $user->is_verified,
                'followers_count' => $user->followers_count ?? 0,
                'posts_count' => $user->posts_count ?? 0,
            ]);

        return Inertia::render('top-users/index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }
}
