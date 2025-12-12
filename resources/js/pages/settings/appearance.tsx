import AppearanceController from '@/actions/App/Http/Controllers/Settings/AppearanceController';
import { Head, Form, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as editAppearance } from '@/routes/appearance';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { useI18n } from '@/contexts/language-context';

export default function Appearance() {
    const { app } = usePage<SharedData>().props;
    const siteName = app?.name ?? 'Laravel Starter Kit';
    const [preview, setPreview] = useState<string | null>(null);
    const { t } = useI18n();
    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [
            {
                title: t('appearance.breadcrumb'),
                href: editAppearance().url,
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

    const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
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

    const logoSrc = useMemo(() => {
        if (preview) return preview;
        if (!app?.logo) return null;

        return `${app.logo}${app.updated_at ? `?v=${encodeURIComponent(app.updated_at)}` : ''}`;
    }, [preview, app?.logo, app?.updated_at]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('appearance.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={t('appearance.title')}
                        description={t('appearance.description')}
                    />

                    <Form
                        {...AppearanceController.update.form()}
                        className="space-y-6"
                        encType="multipart/form-data"
                        onSuccess={() => {
                            setPreview((current) => {
                                if (current) {
                                    URL.revokeObjectURL(current);
                                }
                                return null;
                            });
                        }}
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4 shadow-xs sm:p-5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-16 overflow-hidden rounded-lg ring-2 ring-border">
                                            <AvatarImage
                                                src={logoSrc ?? undefined}
                                                alt={siteName}
                                            />
                                            <AvatarFallback className="rounded-lg bg-neutral-200 text-base font-semibold text-black dark:bg-neutral-700 dark:text-white">
                                                {t('appearance.fallback_logo')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1 text-sm">
                                            <p className="font-semibold text-foreground">
                                                {t('appearance.branding_title')}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {t('appearance.branding_subtitle')}
                                            </p>
                                        </div>
                                    </div>
                                    {preview && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={resetPreview}
                                            >
                                                {t('profile.photo.clear')}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="name">
                                            {t('appearance.site_name')}
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={siteName}
                                            placeholder={t(
                                                'appearance.site_name_placeholder',
                                            )}
                                            autoComplete="organization"
                                        />
                                        <InputError
                                            className="mt-1"
                                            message={errors.name}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor="logo"
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
                                                        {t('appearance.upload_label')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('appearance.upload_hint')}
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
                                                id="logo"
                                                type="file"
                                                name="logo"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                            />
                                        </label>
                                        <InputError
                                            className="mt-1"
                                            message={errors.logo}
                                        />
                                    </div>
                                </div>

                                <AppearanceTabs />

                                <div className="flex items-center gap-4">
                                    <Button disabled={processing}>
                                        {t('appearance.save')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
