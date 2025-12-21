<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostLike;
use App\Models\PostShare;
use App\Models\User;
use App\Support\FeedPostPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserProfileController extends Controller
{
    private const POSTS_PER_PAGE = 10;

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->select('id', 'name', 'email', 'avatar_path', 'is_verified')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($userQuery) use ($search) {
                    $userQuery
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%');
                });
            })
            ->orderBy('name')
            ->limit(20)
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'is_verified' => (bool) $user->is_verified,
            ]);

        return Inertia::render('profiles/index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function show(Request $request, User $user): Response
    {
        $viewer = $request->user();
        $canViewFollowersOnly = $viewer
            ? ($viewer->id === $user->id || $viewer->following()->whereKey($user->id)->exists())
            : false;
        $user->loadCount(['followers', 'following']);
        $postsCount = $user->posts()
            ->when(! $canViewFollowersOnly, function ($query) {
                $query->where('visibility', 'public');
            })
            ->count();
        $posts = $user->posts()
            ->when(! $canViewFollowersOnly, function ($query) {
                $query->where('visibility', 'public');
            })
            ->with([
                'user:id,name,email,avatar_path,is_verified',
                'sharedPost.user:id,name,email,avatar_path,is_verified',
                'rootComments' => function ($query) {
                    $query
                        ->with([
                            'user:id,name,email,avatar_path,is_verified',
                            'replies' => function ($replyQuery) {
                                $replyQuery
                                    ->with('user:id,name,email,avatar_path,is_verified')
                                    ->orderBy('created_at');
                            },
                        ])
                        ->orderBy('created_at');
                },
            ])
            ->latest()
            ->paginate(self::POSTS_PER_PAGE);

        $lookupIds = $posts->getCollection()
            ->pluck('shared_post_id')
            ->filter()
            ->merge($posts->getCollection()->pluck('id'))
            ->unique()
            ->values();

        $likedLookup = [];
        $sharedLookup = [];

        if ($viewer && $lookupIds->isNotEmpty()) {
            $likedPostIds = PostLike::query()
                ->where('user_id', $viewer->id)
                ->whereIn('post_id', $lookupIds)
                ->pluck('post_id')
                ->all();

            $sharedPostIds = PostShare::query()
                ->where('user_id', $viewer->id)
                ->whereIn('post_id', $lookupIds)
                ->pluck('post_id')
                ->all();

            $likedLookup = array_fill_keys($likedPostIds, true);
            $sharedLookup = array_fill_keys($sharedPostIds, true);
        }

        $lookups = [
            'liked' => $likedLookup,
            'shared' => $sharedLookup,
        ];

        $posts->through(fn (Post $post) => FeedPostPresenter::present($post, $lookups));

        return Inertia::render('profiles/show', [
            'profile_user' => [
                'id' => $user->id,
                'name' => $user->name,
                'avatar' => $user->avatar,
                'cover' => $user->cover,
                'bio' => $user->bio,
                'github_url' => $user->github_url,
                'is_verified' => (bool) $user->is_verified,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
                'posts_count' => $postsCount,
                'followers_count' => $user->followers_count ?? 0,
                'following_count' => $user->following_count ?? 0,
                'is_following' => $viewer
                    ? $viewer->following()->whereKey($user->id)->exists()
                    : false,
            ],
            'posts' => Inertia::scroll($posts),
        ]);
    }
}
