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

    public function show(Request $request, User $user): Response
    {
        $viewer = $request->user();
        $user->loadCount(['posts', 'followers', 'following']);
        $posts = $user->posts()
            ->with([
                'user:id,name,email,avatar_path',
                'sharedPost.user:id,name,email,avatar_path',
                'rootComments' => function ($query) {
                    $query
                        ->with([
                            'user:id,name,email,avatar_path',
                            'replies' => function ($replyQuery) {
                                $replyQuery
                                    ->with('user:id,name,email,avatar_path')
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
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
                'posts_count' => $user->posts_count ?? 0,
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
