<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureUserCanManageAppearance
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user) {
            abort(403);
        }

        $user->loadMissing('roles.permissions');

        $allowed = $user->hasRole('admin')
            || $user->hasPermission('manage-appearance')
            || $user->hasPermission('manage-all');

        if (! $allowed) {
            abort(403);
        }

        return $next($request);
    }
}
