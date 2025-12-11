import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import AppLogoIcon from './app-logo-icon';
import { useSidebar } from '@/components/ui/sidebar';

export default function AppLogo() {
    const page = usePage<SharedData>();
    const app = page.props.app;
    const name = app?.name ?? 'Laravel Starter Kit';
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    const logo = app?.logo ? (
        <div className="flex aspect-square size-8 min-w-[2rem] shrink-0 items-center justify-center overflow-hidden rounded-md">
            <img
                src={
                    app.logo &&
                    `${app.logo}${app.updated_at ? `?v=${encodeURIComponent(app.updated_at)}` : ''}`
                }
                alt={name}
                className="h-full w-full object-contain"
            />
        </div>
    ) : (
        <div className="flex aspect-square size-8 min-w-[2rem] shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
        </div>
    );

    return (
        <div className="flex items-center gap-2">
            {logo}
            {!isCollapsed && (
                <div className="ml-1 grid flex-1 text-left text-sm">
                    <span className="mb-0.5 truncate leading-tight font-semibold">{name}</span>
                </div>
            )}
        </div>
    );
}
