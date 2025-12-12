import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren, useMemo } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    const { name, quote, app } = usePage<SharedData>().props;

    const { logoSrc, siteName } = useMemo(() => {
        const siteName = app?.name ?? name ?? 'Laravel Starter Kit';
        const logoSrc = app?.logo
            ? `${app.logo}${app.updated_at ? `?v=${encodeURIComponent(app.updated_at)}` : ''}`
            : null;
        return { logoSrc, siteName };
    }, [app, name]);

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-900" />
                <Link
                    href={home()}
                    className="relative z-20 flex items-center text-lg font-medium"
                >
                    <span className="mr-2 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-md">
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt={siteName}
                                className="h-full w-full rounded-md object-contain"
                            />
                        ) : (
                            <AppLogoIcon className="size-16 fill-current text-white" />
                        )}
                    </span>
                    {siteName}
                </Link>
                {quote && (
                    <div className="relative z-20 mt-auto">
                        <blockquote className="space-y-2">
                            <p className="text-lg">
                                &ldquo;{quote.message}&rdquo;
                            </p>
                            <footer className="text-sm text-neutral-300">
                                {quote.author}
                            </footer>
                        </blockquote>
                    </div>
                )}
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link
                        href={home()}
                        className="relative z-20 flex items-center justify-center lg:hidden"
                    >
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt={siteName}
                                className="h-20 w-20 rounded-md object-contain sm:h-24 sm:w-24"
                            />
                        ) : (
                            <AppLogoIcon className="h-20 fill-current text-black sm:h-24" />
                        )}
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
