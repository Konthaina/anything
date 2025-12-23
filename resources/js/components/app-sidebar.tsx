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
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, Goal, Newspaper } from 'lucide-react';
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
            {
                title: t('nav.topusers'),
                href: '/top-users',
                icon: Goal,
            }
        ],
        [t],
    );

    const footerNavItems: NavItem[] = useMemo(
        () => [
            {
                title: t('nav.repository'),
                href: 'https://github.com/Konthaina/anything',
                icon: Folder,
            },
            {
                title: t('nav.documentation'),
                href: 'https://github.com/Konthaina/anything/blob/main/README.md',
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
                            {/* <Link href={dashboard()} prefetch> */}
                            <Link href="/feed" prefetch>
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
