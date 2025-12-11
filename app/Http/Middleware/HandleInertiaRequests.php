<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\SiteSetting;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Auth;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $site = Schema::hasTable('site_settings')
            ? SiteSetting::query()->latest()->first()
            : null;

        $siteName = $site?->name ?? config('app.name');
        $user = $request->user();
        if ($user) {
            $user->loadMissing('roles.permissions');
        }

        return [
            ...parent::share($request),
            'name' => $siteName,
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'app' => [
                'name' => $siteName,
                'logo' => $site?->logo,
                'updated_at' => optional($site?->updated_at)?->toIso8601String(),
            ],
            'canManageUsers' => $user
                ? ($user->hasRole('admin') || $user->hasPermission('manage-users') || $user->hasPermission('manage-all'))
                : false,
            'canManageAll' => $user?->hasPermission('manage-all') ?? false,
            'canManageRoles' => $user
                ? ($user->hasRole('admin') || $user->hasPermission('manage-roles') || $user->hasPermission('manage-all'))
                : false,
        ];
    }
}
