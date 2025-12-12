import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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
import { useI18n } from '@/contexts/language-context';
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
    meta?: {
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
        per_page: number;
    };
}

export default function AdminSettings() {
    const { users, roles, permissions, canManageRoles, filters } = usePage<
        SharedData & {
            users: Paginated<UserWithRoles>;
            roles: Role[];
            permissions: Permission[];
            filters?: { search?: string };
        }
    >().props;
    const { t } = useI18n();

    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState(() => filters?.search ?? '');
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>(
        canManageRoles ? 'users' : 'users',
    );
    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [{ title: t('admin.breadcrumb'), href: '/settings/admin' }],
        [t],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.title')} />
            <SettingsLayout wide>
                <div className="space-y-6">
                    <HeadingSmall
                        title={t('admin.title')}
                        description={t('admin.description')}
                    />

                    <div className="flex items-center gap-6 pb-3">
                        {(
                            [
                                ['users', t('admin.tabs.users')],
                                ...(canManageRoles
                                    ? ([
                                          ['roles', t('admin.tabs.roles')],
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
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <CreateUserForm />
                                <Form method="get" action="/settings/admin" data={{ search }}>
                                    {({ setData, processing }) => (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                name="search"
                                                value={search}
                                                onChange={(e) => {
                                                    setSearch(e.target.value);
                                                    setData('search', e.target.value);
                                                }}
                                                placeholder={t('admin.search_placeholder')}
                                                className="w-56"
                                            />
                                            <Button size="sm" variant="secondary" type="submit" disabled={processing}>
                                                {t('common.search')}
                                            </Button>
                                            {search && (
                                                <Link
                                                    href="/settings/admin"
                                                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                                                >
                                                    {t('common.clear')}
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </Form>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-border">
                                <div className="min-w-[880px]">
                                    <div className="grid grid-cols-12 items-center gap-3 bg-muted/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        <span className="col-span-5">{t('common.name')}</span>
                                        <span className="col-span-3">{t('common.email')}</span>
                                        <span className="col-span-2">{t('common.role')}</span>
                                        <span className="col-span-1 text-center">{t('common.updated')}</span>
                                        <span className="col-span-1 text-right">{t('common.action')}</span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {users.data.map((user) => (
                                            <UserRow
                                                key={`${user.id}-${user.updated_at ?? 'na'}`}
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

                            <Pagination links={users.links} meta={users.meta} />
                        </div>
                    )}

                    {activeTab === 'roles' && canManageRoles && (
                        <div className="space-y-4 rounded-lg border border-border bg-background/80 p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">
                                        {t('admin.roles_section.title')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('admin.roles_section.description')}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <CreateRoleForm />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {roles.map((role) => (
                                    <RolePermissionsForm
                                        key={`${role.id}-${role.name}-${(role.permissions ?? [])
                                            .map((perm) => perm.id)
                                            .join('-')}`}
                                        role={role}
                                        permissions={permissions}
                                    />
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
    const [selected, setSelected] = useState<number[]>(() => user.roles.map((role) => role.id));
    const [name, setName] = useState(() => user.name);
    const [email, setEmail] = useState(() => user.email);
    const [password, setPassword] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const { t } = useI18n();

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
                    {user.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                            {t('admin.table.no_role')}
                        </span>
                    )}
                </div>
            </div>
            <div className="col-span-1 text-center text-sm text-muted-foreground">
                {user.updated_at ? formatDate(user.updated_at) : t('common.not_available')}
            </div>
            <div className="col-span-1 text-right text-sm font-semibold text-primary">
                <button type="button" className="underline-offset-4 hover:underline" onClick={onToggleEdit}>
                    {isEditing ? t('common.close') : t('common.edit')}
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
                                        <Label className="text-xs text-muted-foreground">
                                            {t('common.name')}
                                        </Label>
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
                                        <Label className="text-xs text-muted-foreground">
                                            {t('common.email')}
                                        </Label>
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
                                            {t('admin.table.password_hint')}
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
                                            placeholder={t('admin.create_user.password_placeholder')}
                                        />
                                        <InputError message={updateErrors.password} />
                                    </div>
                                    <div className="sm:col-span-3 flex gap-2">
                                        <Button size="sm" disabled={updating} type="submit">
                                            {t('admin.table.save_user')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Form>

                        <div className="relative">
                            <Form method="post" action={deleteAction}>
                                {({ processing: deleting, submit }) => (
                                    <>
                                        <input type="hidden" name="_method" value="DELETE" />
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            disabled={deleting}
                                            type="button"
                                            onClick={() => setShowConfirm(true)}
                                        >
                                            {t('admin.table.delete_user')}
                                        </Button>

                                        {showConfirm && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                                                <div className="w-full max-w-md rounded-lg bg-background p-5 shadow-lg ring-1 ring-border">
                                                    <h3 className="text-base font-semibold text-foreground">
                                                        {t('admin.table.delete_user_title')}
                                                    </h3>
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        {t('admin.table.delete_user_confirm', {
                                                            name: user.name,
                                                        })}
                                                    </p>
                                                    <div className="mt-4 flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => setShowConfirm(false)}
                                                        >
                                                            {t('common.cancel')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={deleting}
                                                            onClick={() => {
                                                                setShowConfirm(false);
                                                                submit();
                                                            }}
                                                        >
                                                            {t('admin.table.confirm_delete')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </Form>
                        </div>

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
                                            {t('admin.table.save_roles')}
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
    const [selected, setSelected] = useState<number[]>(() => role.permissions?.map((perm) => perm.id) ?? []);
    const [roleName, setRoleName] = useState(() => role.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { t } = useI18n();

    const action = `/settings/admin/roles/${role.id}/permissions`;

    return (
        <div className="rounded-md border border-border bg-background p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Form method="post" action={`/settings/admin/roles/${role.id}`} data={{ name: roleName }}>
                    {({ setData, processing, errors }) => (
                        <div className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="_method" value="PATCH" />
                            <Input
                                name="name"
                                value={roleName}
                                onChange={(e) => {
                                    setRoleName(e.target.value);
                                    setData('name', e.target.value);
                                }}
                                className="w-40 sm:w-56"
                            />
                            <Button size="sm" type="submit" disabled={processing || role.slug === 'admin'}>
                                {t('admin.roles_section.rename')}
                            </Button>
                            <InputError message={errors.name} />
                        </div>
                    )}
                </Form>

                <div className="relative">
                    <Form method="post" action={`/settings/admin/roles/${role.id}`}>
                        {({ processing, submit }) => (
                            <>
                                <input type="hidden" name="_method" value="DELETE" />
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    type="button"
                                    disabled={processing || role.slug === 'admin'}
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    {t('admin.roles_section.delete_role')}
                                </Button>

                                {showDeleteConfirm && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                                        <div className="w-full max-w-md rounded-lg bg-background p-5 shadow-lg ring-1 ring-border">
                                            <h3 className="text-base font-semibold text-foreground">
                                                {t('admin.roles_section.delete_role')}
                                            </h3>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {t('admin.roles_section.delete_role_confirm', {
                                                    role: role.name,
                                                })}
                                            </p>
                                            <div className="mt-4 flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                >
                                                    {t('common.cancel')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={processing}
                                                    onClick={() => {
                                                        setShowDeleteConfirm(false);
                                                        submit();
                                                    }}
                                                >
                                                    {t('admin.table.confirm_delete')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </Form>
                </div>
            </div>

            <Form method="post" action={action} data={{ permissions: selected }}>
                {({ setData, processing, errors }) => (
                    <>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {selected.length === 0 ? (
                                <Badge variant="secondary">
                                    {t('admin.roles_section.no_permissions')}
                                </Badge>
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
                                {t('admin.roles_section.save_permissions')}
                            </Button>
                            <InputError message={errors.permissions} />
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

function CreateRoleForm() {
    const [name, setName] = useState('');
    const action = '/settings/admin/roles';
    const { t } = useI18n();

    return (
        <Form method="post" action={action} data={{ name }}>
            {({ setData, processing, errors }) => (
                <div className="flex items-center gap-2">
                    <Input
                        name="name"
                        placeholder={t('admin.roles_section.new_role_placeholder')}
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setData('name', e.target.value);
                        }}
                        className="w-36"
                    />
                    <Button size="sm" disabled={processing} type="submit">
                        {t('admin.roles_section.add_role')}
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
    const { t } = useI18n();

    return (
        <Form method="post" action={action} data={{ name, email, password }}>
            {({ setData, processing, errors }) => (
                <div className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-3 sm:gap-3 sm:p-4">
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">
                            {t('common.name')}
                        </Label>
                        <Input
                            name="name"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setData('name', e.target.value);
                            }}
                            placeholder={t('admin.create_user.name_placeholder')}
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">
                            {t('common.email')}
                        </Label>
                        <Input
                            name="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setData('email', e.target.value);
                            }}
                            placeholder={t('admin.create_user.email_placeholder')}
                            type="email"
                        />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">
                            {t('auth.password_label')}
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                name="password"
                                value={password}
                                onChange={(e) => {
                                setPassword(e.target.value);
                                setData('password', e.target.value);
                            }}
                                placeholder={t('admin.create_user.password_placeholder')}
                                type="password"
                            />
                            <Button size="sm" disabled={processing} type="submit">
                                {t('admin.create_user.add')}
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
    meta,
}: {
    links: { url: string | null; label: string; active: boolean }[];
    meta?: { current_page: number; last_page: number; from: number | null; to: number | null; total: number };
}) {
    const { t } = useI18n();
    if (!links || links.length === 0) return null;

    return (
        <div className="flex flex-col items-center gap-2 bg-background px-3 py-2 text-sm">
            {meta && meta.total > 0 && (
                <div className="text-muted-foreground text-center">
                    {t('admin.pagination', { from: meta.from ?? 0, to: meta.to ?? 0, total: meta.total })}
                </div>
            )}
            {links?.length ? (
                <div className="flex items-center gap-1">
                    {links.map((link, idx) => {
                        const isPrev = idx === 0;
                        const isNext = idx === links.length - 1;
                        const label = isPrev
                            ? t('common.previous')
                            : isNext
                              ? t('common.next')
                              : link.label.replace(/&laquo;|&raquo;|;/g, '');

                        const disabled = !link.url;

                        return (
                            <Link
                                key={`${link.label}-${idx}`}
                                href={link.url ?? '#'}
                                className={[
                                    'rounded-md px-3 py-1 transition',
                                    link.active ? 'bg-foreground text-background' : 'text-foreground/80 hover:bg-muted',
                                    disabled && 'cursor-not-allowed opacity-50',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                aria-disabled={disabled}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>
            ) : null}
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
