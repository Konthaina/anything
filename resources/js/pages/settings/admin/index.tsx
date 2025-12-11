import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';

interface Role {
    id: number;
    name: string;
    slug: string;
    permissions?: Permission[];
}

interface Permission {
    id: number;
    name: string;
    slug: string;
}

interface UserWithRoles {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    updated_at?: string | null;
    roles: Role[];
}

interface Paginated<T> {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'User management', href: '/settings/admin' }];

export default function AdminSettings() {
    const { users, roles, permissions, canManageRoles } = usePage<
        SharedData & {
            users: Paginated<UserWithRoles>;
            roles: Role[];
            permissions: Permission[];
        }
    >().props;

    const [editingId, setEditingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>(
        canManageRoles ? 'users' : 'users',
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User management" />
            <SettingsLayout wide>
                <div className="space-y-6">
                    <HeadingSmall
                        title="User management"
                        description="Create users, assign roles, and manage permissions"
                    />

                    <div className="flex items-center gap-6 pb-3">
                        {(
                            [
                                ['users', 'Users'],
                                ...(canManageRoles
                                    ? ([
                                          ['roles', 'Roles and Permissions'],
                                      ] as const)
                                    : []),
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className="relative pb-2 text-sm font-semibold"
                                aria-current={activeTab === key}
                            >
                                <span
                                    className={
                                        activeTab === key
                                            ? 'text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }
                                >
                                    {label}
                                </span>
                                {activeTab === key && (
                                    <span className="absolute inset-x-0 -bottom-[11px] h-0.5 rounded-full bg-emerald-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'users' && (
                        <div className="space-y-4 rounded-lg border border-border bg-background/90 p-4 shadow-sm">
                            <CreateUserForm />

                            <div className="overflow-x-auto rounded-lg border border-border">
                                <div className="min-w-[880px]">
                                    <div className="grid grid-cols-12 items-center gap-3 bg-muted/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        <span className="col-span-5">Name</span>
                                        <span className="col-span-3">Email</span>
                                        <span className="col-span-2">Role</span>
                                        <span className="col-span-1 text-center">Updated</span>
                                        <span className="col-span-1 text-right">Action</span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {users.data.map((user) => (
                                            <UserRow
                                                key={user.id}
                                                user={user}
                                                roles={roles}
                                                isEditing={editingId === user.id}
                                                onToggleEdit={() =>
                                                    setEditingId(editingId === user.id ? null : user.id)
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Pagination links={users.links} />
                        </div>
                    )}

                    {activeTab === 'roles' && canManageRoles && (
                        <div className="space-y-4 rounded-lg border border-border bg-background/80 p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">Roles & permissions</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Create roles and attach permissions.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <CreateRoleForm />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {roles.map((role) => (
                                    <RolePermissionsForm key={role.id} role={role} permissions={permissions} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

function UserRow({
    user,
    roles,
    isEditing,
    onToggleEdit,
}: {
    user: UserWithRoles;
    roles: Role[];
    isEditing: boolean;
    onToggleEdit: () => void;
}) {
    const [selected, setSelected] = useState<number[]>(user.roles.map((role) => role.id));
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [password, setPassword] = useState('');

    useEffect(() => {
        setSelected(user.roles.map((role) => role.id));
        setName(user.name);
        setEmail(user.email);
        setPassword('');
    }, [user.roles, user.name, user.email]);

    const rolesAction = `/settings/admin/users/${user.id}/roles`;
    const updateAction = `/settings/admin/users/${user.id}`;
    const deleteAction = `/settings/admin/users/${user.id}`;

    const initials = useMemo(() => {
        return (
            user.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || '?'
        );
    }, [user.name]);

    return (
        <div className="grid grid-cols-12 items-center gap-3 px-4 py-3 hover:bg-muted/40">
            <div className="col-span-5 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                    <AvatarFallback className="bg-muted text-sm font-semibold text-foreground/80">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{user.name}</span>
                </div>
            </div>
            <div className="col-span-3 text-sm text-muted-foreground">{user.email}</div>
            <div className="col-span-2 text-sm">
                <div className="flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                        <Badge key={role.id} variant="outline">
                            {role.name}
                        </Badge>
                    ))}
                    {user.roles.length === 0 && <span className="text-xs text-muted-foreground">No role</span>}
                </div>
            </div>
            <div className="col-span-1 text-center text-sm text-muted-foreground">
                {user.updated_at ? formatDate(user.updated_at) : '—'}
            </div>
            <div className="col-span-1 text-right text-sm font-semibold text-primary">
                <button type="button" className="underline-offset-4 hover:underline" onClick={onToggleEdit}>
                    {isEditing ? 'Close' : 'Edit'}
                </button>
            </div>

            {isEditing && (
                <div className="col-span-12 mt-3 rounded-md bg-background p-4 shadow-sm">
                    <div className="flex flex-col gap-4">
                        <Form method="post" action={updateAction} data={{ name, email, password }}>
                            {({ setData: setUpdateData, processing: updating, errors: updateErrors }) => (
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <input type="hidden" name="_method" value="PATCH" />
                                    <div className="grid gap-1">
                                        <Label className="text-xs text-muted-foreground">Name</Label>
                                        <Input
                                            name="name"
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                setUpdateData('name', e.target.value);
                                            }}
                                        />
                                        <InputError message={updateErrors.name} />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs text-muted-foreground">Email</Label>
                                        <Input
                                            name="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setUpdateData('email', e.target.value);
                                            }}
                                            type="email"
                                        />
                                        <InputError message={updateErrors.email} />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs text-muted-foreground">
                                            Password (leave blank to keep)
                                        </Label>
                                        <Input
                                            name="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                setPassword(next);
                                                setUpdateData('password', next === '' ? null : next);
                                            }}
                                            placeholder="********"
                                        />
                                        <InputError message={updateErrors.password} />
                                    </div>
                                    <div className="sm:col-span-3 flex gap-2">
                                        <Button size="sm" disabled={updating} type="submit">
                                            Save user
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Form>

                        <Form method="post" action={deleteAction}>
                            {({ processing: deleting }) => (
                                <>
                                    <input type="hidden" name="_method" value="DELETE" />
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={deleting}
                                        type="submit"
                                    >
                                        Delete user
                                    </Button>
                                </>
                            )}
                        </Form>

                        <Form method="post" action={rolesAction} data={{ roles: selected }}>
                            {({ setData, processing, errors }) => (
                                <>
                                    {selected.map((roleId) => (
                                        <input key={roleId} type="hidden" name="roles[]" value={roleId} />
                                    ))}
                                    <input type="hidden" name="_method" value="PATCH" />
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {roles.map((role) => {
                                            const checked = selected.includes(role.id);
                                            return (
                                                <label
                                                    key={role.id}
                                                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                                                >
                                                    <Checkbox
                                                        checked={checked}
                                                        onCheckedChange={(value) => {
                                                            const isChecked = Boolean(value);
                                                            const next = isChecked
                                                                ? [...selected, role.id]
                                                                : selected.filter((id) => id !== role.id);
                                                            setSelected(next);
                                                            setData('roles', next);
                                                        }}
                                                    />
                                                    {role.name}
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-3 flex items-center gap-3">
                                        <Button size="sm" disabled={processing} type="submit">
                                            Save roles
                                        </Button>
                                        <InputError message={errors.roles} />
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>
            )}
        </div>
    );
}

function RolePermissionsForm({
    role,
    permissions,
}: {
    role: Role;
    permissions: Permission[];
}) {
    const [selected, setSelected] = useState<number[]>(role.permissions?.map((perm) => perm.id) ?? []);

    useEffect(() => {
        setSelected(role.permissions?.map((perm) => perm.id) ?? []);
    }, [role.permissions]);

    const action = `/settings/admin/roles/${role.id}/permissions`;

    return (
        <Form method="post" action={action} data={{ permissions: selected }}>
            {({ setData, processing, errors }) => (
                <div className="rounded-md border border-border bg-background p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-foreground">{role.name}</p>
                            <p className="text-xs text-muted-foreground">{role.slug}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selected.length === 0 ? (
                                <Badge variant="secondary">No permissions</Badge>
                            ) : (
                                selected.map((permissionId) => {
                                    const perm = permissions.find((p) => p.id === permissionId);
                                    if (!perm) return null;
                                    return (
                                        <Badge key={perm.id} variant="outline">
                                            {perm.name}
                                        </Badge>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {permissions.map((perm) => {
                            const checked = selected.includes(perm.id);
                            return (
                                <label
                                    key={perm.id}
                                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                                >
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) => {
                                            const isChecked = Boolean(value);
                                            const next = isChecked
                                                ? [...selected, perm.id]
                                                : selected.filter((id) => id !== perm.id);
                                            setSelected(next);
                                            setData('permissions', next);
                                        }}
                                    />
                                    {perm.name}
                                </label>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                        {selected.map((permId) => (
                            <input key={permId} type="hidden" name="permissions[]" value={permId} />
                        ))}
                        <input type="hidden" name="_method" value="PATCH" />
                        <Button size="sm" disabled={processing}>
                            Save permissions
                        </Button>
                        <InputError message={errors.permissions} />
                    </div>
                </div>
            )}
        </Form>
    );
}

function CreateRoleForm() {
    const [name, setName] = useState('');
    const action = '/settings/admin/roles';

    return (
        <Form method="post" action={action} data={{ name }}>
            {({ setData, processing, errors }) => (
                <div className="flex items-center gap-2">
                    <Input
                        name="name"
                        placeholder="New role"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setData('name', e.target.value);
                        }}
                        className="w-36"
                    />
                    <Button size="sm" disabled={processing} type="submit">
                        Add role
                    </Button>
                    <InputError message={errors.name} />
                </div>
            )}
        </Form>
    );
}

function CreateUserForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const action = '/settings/admin/users';

    return (
        <Form method="post" action={action} data={{ name, email, password }}>
            {({ setData, processing, errors }) => (
                <div className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-3 sm:gap-3 sm:p-4">
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input
                            name="name"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setData('name', e.target.value);
                            }}
                            placeholder="New user name"
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input
                            name="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setData('email', e.target.value);
                            }}
                            placeholder="user@example.com"
                            type="email"
                        />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Password</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                name="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setData('password', e.target.value);
                                }}
                                placeholder="Min 8 characters"
                                type="password"
                            />
                            <Button size="sm" disabled={processing} type="submit">
                                Add
                            </Button>
                        </div>
                        <InputError message={errors.password} />
                    </div>
                </div>
            )}
        </Form>
    );
}

function Pagination({
    links,
}: {
    links: { url: string | null; label: string; active: boolean }[];
}) {
    if (!links || links.length <= 3) return null;

    return (
        <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
            {links.map((link, idx) => {
                const isPrev = idx === 0;
                const isNext = idx === links.length - 1;
                const label = isPrev
                    ? 'Previous'
                    : isNext
                      ? 'Next'
                      : link.label.replace(/&laquo;|&raquo;|;/g, '');

                return (
                    <Link
                        key={`${link.label}-${idx}`}
                        href={link.url ?? '#'}
                        className={[
                            'rounded-md px-3 py-1 transition',
                            link.active ? 'bg-foreground text-background' : 'text-foreground/80 hover:bg-muted',
                            !link.url && 'cursor-not-allowed opacity-50',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        aria-disabled={!link.url}
                    >
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}
