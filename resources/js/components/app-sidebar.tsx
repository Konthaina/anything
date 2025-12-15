import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { useI18n } from '@/contexts/language-context';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Newspaper } from 'lucide-react';
import { useMemo } from 'react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { t } = useI18n();

    const mainNavItems: NavItem[] = useMemo(
        () => [
            // {
            //     title: t('nav.dashboard'),
            //     href: dashboard(),
            //     icon: LayoutGrid,
            // },
            {
                title: t('nav.feed'),
                href: '/feed',
                icon: Newspaper,
            },
        ],
        [t],
    );

    const footerNavItems: NavItem[] = useMemo(
        () => [
            {
                title: t('nav.repository'),
                href: 'https://github.com/laravel/react-starter-kit',
                icon: Folder,
            },
            {
                title: t('nav.documentation'),
                href: 'https://laravel.com/docs/starter-kits#react',
                icon: BookOpen,
            },
        ],
        [t],
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
