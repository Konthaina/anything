<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureUserHasRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role)
    {
        $user = $request->user();

        if (! $user || ! $user->relationLoaded('roles')) {
            $user?->load('roles');
        }

        if (! $user || ! $user->hasRole($role)) {
            abort(403);
        }

        return $next($request);
    }
}
