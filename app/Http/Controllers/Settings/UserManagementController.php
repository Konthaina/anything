<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Show the user, role, and permission management page.
     */
    public function index(Request $request): Response
    {
        $search = (string) $request->query('search', '');

        return Inertia::render('settings/admin/index', [
            'users' => User::query()
                ->select('id', 'name', 'email', 'avatar_path', 'updated_at')
                ->when($search !== '', function ($query) use ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', '%'.$search.'%')
                            ->orWhere('email', 'like', '%'.$search.'%');
                    });
                })
                ->with('roles:id,name,slug')
                ->orderBy('name')
                ->paginate(8)
                ->withQueryString(),
            'roles' => Role::query()
                ->select('id', 'name', 'slug')
                ->with('permissions:id,name,slug')
                ->get(),
            'permissions' => Permission::query()
                ->select('id', 'name', 'slug')
                ->get(),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Create a new role.
     */
    public function storeRole(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $slug = Str::slug($data['name']);

        Role::firstOrCreate(
            ['slug' => $slug],
            ['name' => $data['name']]
        );

        return back();
    }

    /**
     * Update a user's roles.
     */
    public function updateUserRoles(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'roles' => ['array'],
            'roles.*' => ['integer', 'exists:roles,id'],
        ]);

        $user->roles()->sync($data['roles'] ?? []);

        return back();
    }

    /**
     * Create a new user.
     */
    public function storeUser(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        User::create($data);

        return back();
    }

    /**
     * Update a user's basic info and password.
     */
    public function updateUser(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $user->name = $data['name'];
        $user->email = $data['email'];

        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        $user->save();

        return back();
    }

    /**
     * Delete a user.
     */
    public function destroyUser(User $user): RedirectResponse
    {
        $user->roles()->detach();
        $user->delete();

        return back();
    }

    /**
     * Update a role's permissions.
     */
    public function updateRolePermissions(Request $request, Role $role): RedirectResponse
    {
        $data = $request->validate([
            'permissions' => ['array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role->permissions()->sync($data['permissions'] ?? []);

        return back();
    }

    /**
     * Update a role's name (and slug).
     */
    public function updateRole(Request $request, Role $role): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        if ($role->slug === 'admin') {
            return back();
        }

        $role->update([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
        ]);

        return back();
    }

    /**
     * Delete a role.
     */
    public function destroyRole(Role $role): RedirectResponse
    {
        if ($role->slug === 'admin') {
            return back();
        }

        DB::transaction(function () use ($role): void {
            $role->permissions()->detach();
            $role->users()->detach();
            $role->delete();
        });

        return back();
    }
}
