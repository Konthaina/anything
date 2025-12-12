import AppLogoIcon from '@/components/app-logo-icon';
import { LanguageSwitcher } from '@/components/language-switcher';
import { home } from '@/routes';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren, useMemo } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    const { app } = usePage<SharedData>().props;

    const { logoSrc, siteName } = useMemo(() => {
        const siteName = app?.name ?? 'Laravel Starter Kit';
        const logoSrc = app?.logo
            ? `${app.logo}${app.updated_at ? `?v=${encodeURIComponent(app.updated_at)}` : ''}`
            : null;
        return { logoSrc, siteName };
    }, [app]);

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="fixed right-4 top-4 z-50">
                <LanguageSwitcher size="sm" />
            </div>
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                    href={home()}
                    className="flex flex-col items-center gap-2 font-medium"
                >
                    <div className="mb-1 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-md">
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt={siteName}
                                className="h-full w-full rounded-md object-contain"
                            />
                        ) : (
                            <AppLogoIcon className="size-[4.5rem] fill-current text-[var(--foreground)] dark:text-white" />
                        )}
                    </div>
                    <span className="sr-only">{title}</span>
                </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-medium">{title}</h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
