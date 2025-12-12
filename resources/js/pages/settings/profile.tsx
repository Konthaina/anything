import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { send } from '@/routes/verification';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { useInitials } from '@/hooks/use-initials';
import { useI18n } from '@/contexts/language-context';

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<SharedData>().props;
    const [preview, setPreview] = useState<string | null>(null);
    const getInitials = useInitials();
    const { t } = useI18n();
    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [
            {
                title: t('profile.breadcrumb'),
                href: edit().url,
            },
        ],
        [t],
    );

    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        setPreview((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }

            return file ? URL.createObjectURL(file) : null;
        });

    };

    const resetPreview = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setPreview((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return null;
        });
    };

    const avatarSrc = useMemo(() => {
        if (preview) return preview;
        if (!auth.user.avatar) return null;

        return `${auth.user.avatar}?v=${encodeURIComponent(auth.user.updated_at)}`;
    }, [preview, auth.user.avatar, auth.user.updated_at]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('profile.breadcrumb')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={t('profile.title')}
                        description={t('profile.description')}
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        onSuccess={() => {
                            setPreview((current) => {
                                if (current) {
                                    URL.revokeObjectURL(current);
                                }
                                return null;
                            });
                        }}
                        className="space-y-6"
                        encType="multipart/form-data"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">
                                        {t('auth.name_label')}
                                    </Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder={t('auth.name_placeholder')}
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        {t('auth.email_label')}
                                    </Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder={t('auth.email_placeholder')}
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                                <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4 shadow-xs sm:p-5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-16 overflow-hidden rounded-full ring-2 ring-border">
                                                <AvatarImage
                                                    src={avatarSrc ?? undefined}
                                                    alt={auth.user.name}
                                                />
                                                <AvatarFallback className="rounded-lg bg-neutral-200 text-base font-semibold text-black dark:bg-neutral-700 dark:text-white">
                                                    {getInitials(auth.user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1 text-sm">
                                                <p className="font-semibold text-foreground">
                                                    {t('profile.photo.title')}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {t('profile.photo.hint')}
                                                </p>
                                                {preview ? (
                                                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">
                                                        {t('profile.photo.new')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-50">
                                                        {t('profile.photo.saved')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {preview && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="justify-center"
                                                onClick={resetPreview}
                                            >
                                                {t('profile.photo.clear')}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor="avatar"
                                            className="group relative block cursor-pointer overflow-hidden rounded-lg border border-dashed border-border bg-background/70 transition hover:border-foreground/50 hover:bg-muted"
                                        >
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground transition group-hover:scale-105">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        className="h-5 w-5"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M12 4v16m8-8H4"
                                                        />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t('profile.photo.upload')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('profile.photo.upload_hint')}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="pointer-events-none"
                                                    type="button"
                                                >
                                                    {t('profile.photo.browse')}
                                                </Button>
                                            </div>
                                            <Input
                                                id="avatar"
                                                type="file"
                                                name="avatar"
                                                accept="image/*"
                                                onChange={handleAvatarChange}
                                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                            />
                                        </label>
                                        <InputError
                                            className="mt-1"
                                            message={errors.avatar}
                                        />
                                    </div>
                                </div>

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                {t('profile.verify.unverified')}{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    {t('profile.verify.resend')}
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    {t('profile.verify.sent')}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        {t('common.save')}
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            {t('profile.saved')}
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
