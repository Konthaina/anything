import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface NotificationActor {
    id: number;
    name: string;
    avatar?: string | null;
}

export interface NotificationPayload {
    actor?: NotificationActor;
    post_id?: number | string;
    comment_id?: number | string;
    parent_comment_id?: number | string;
    post_excerpt?: string;
    comment_excerpt?: string;
    reply_excerpt?: string;
    parent_excerpt?: string;
    [key: string]: unknown;
}

export interface AppNotification {
    id: string;
    type: string;
    message: string;
    data: NotificationPayload;
    created_at?: string;
    read_at?: string | null;
}

export interface SharedData {
    name: string;
    app?: {
        name: string;
        logo?: string | null;
        updated_at?: string | null;
    };
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    canManageAppearance?: boolean;
    canManageUsers?: boolean;
    canManageAll?: boolean;
    canManageRoles?: boolean;
    notifications?: AppNotification[];
    notifications_unread_count?: number;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    cover?: string | null;
    bio?: string | null;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
