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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: editAppearance().url,
    },
];

export default function Appearance() {
    const { app } = usePage<SharedData>().props;
    const siteName = app?.name ?? 'Laravel Starter Kit';
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

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

        setFileName(file?.name ?? null);
    };

    const resetPreview = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setPreview((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return null;
        });
        setFileName(null);
    };

    const logoSrc = useMemo(() => {
        if (preview) return preview;
        if (!app?.logo) return null;

        return `${app.logo}${app.updated_at ? `?v=${encodeURIComponent(app.updated_at)}` : ''}`;
    }, [preview, app?.logo, app?.updated_at]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Appearance settings"
                        description="Update the site name and logo"
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
                            setFileName(null);
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
                                                    Logo
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1 text-sm">
                                                <p className="font-semibold text-foreground">
                                                    Site branding
                                                </p>
                                                <p className="text-muted-foreground">
                                                    Upload a logo to show in the app header and sidebar.
                                                </p>
                                            </div>
                                        </div>
                                        {preview && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={resetPreview}
                                            >
                                                Clear selection
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="name">Site name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={siteName}
                                            placeholder="Your site name"
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
                                                        Choose a logo file
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        PNG, JPG, or GIF up to 2MB. Drag & drop or click to browse.
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="pointer-events-none"
                                                    type="button"
                                                >
                                                    Browse
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
                                    <Button disabled={processing}>Save changes</Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
