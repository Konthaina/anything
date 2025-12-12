import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren, useMemo } from 'react';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    const { app } = usePage<SharedData>().props;

    const { logoSrc, siteName } = useMemo(() => {
        const siteName = app?.name ?? 'Laravel Starter Kit';
        const logoSrc = app?.logo
            ? `${app.logo}${app.updated_at ? `?v=${encodeURIComponent(app.updated_at)}` : ''}`
            : null;
        return { logoSrc, siteName };
    }, [app]);

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className="flex w-full max-w-md flex-col gap-6">
                <Link
                    href={home()}
                    className="flex items-center gap-2 self-center font-medium"
                >
                    <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center">
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt={siteName}
                                className="h-full w-full rounded-md object-contain"
                            />
                        ) : (
                            <AppLogoIcon className="size-[4.5rem] fill-current text-black dark:text-white" />
                        )}
                    </div>
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
