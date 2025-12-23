import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/contexts/language-context';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { show as showProfile } from '@/routes/profiles';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import { BadgeCheck, Search } from 'lucide-react';
import { useMemo } from 'react';

interface TopUser {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    is_verified?: boolean;
    followers_count?: number;
    posts_count?: number;
}

export default function TopUsersIndex() {
    const { users, filters } = usePage<
        SharedData & { users: TopUser[]; filters?: { search?: string } }
    >().props;
    const { t } = useI18n();
    const getInitials = useInitials();
    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [{ title: t('top_users.title'), href: '/top-users' }],
        [t],
    );
    const search = filters?.search ?? '';
    const hasResults = users.length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('top_users.title')} />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-lg font-semibold text-foreground">
                            {t('top_users.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('top_users.description')}
                        </p>
                        {search && (
                            <p className="text-sm text-muted-foreground">
                                {t('common.search')}: <span className="font-semibold text-foreground">{search}</span>
                            </p>
                        )}
                    </div>
                    <Form
                        key={`top-users-search-${search}`}
                        method="get"
                        action="/profiles"
                        data={{ search }}
                        className="w-full sm:max-w-sm"
                    >
                        {({ setData }) => (
                            <div className="relative flex items-center">
                                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    name="search"
                                    defaultValue={search}
                                    onChange={(event) => {
                                        setData('search', event.target.value);
                                    }}
                                    placeholder={t('header.search_placeholder')}
                                    aria-label={t('header.search_placeholder')}
                                    className="h-9 w-full pl-9 text-sm"
                                />
                            </div>
                        )}
                    </Form>
                </div>

                {hasResults ? (
                    <div className="grid gap-3">
                        {users.map((user, index) => (
                            <Link
                                key={user.id}
                                href={showProfile(user.id)}
                                className="group rounded-xl border border-border bg-card transition hover:border-primary/40 hover:bg-muted/40"
                            >
                                <Card className="border-0 bg-transparent shadow-none">
                                    <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-sm font-semibold text-foreground">
                                            #{index + 1}
                                        </div>
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage
                                                src={user.avatar ?? undefined}
                                                alt={user.name}
                                            />
                                            <AvatarFallback className="bg-muted text-foreground">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-semibold text-foreground">
                                                    {user.name}
                                                </span>
                                                {user.is_verified && (
                                                    <span className="inline-flex items-center justify-center rounded-full bg-sky-100 p-1 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                                        <BadgeCheck className="h-3.5 w-3.5" />
                                                    </span>
                                                )}
                                            </div>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {user.email}
                                            </span>
                                        </div>
                                        <div className="ml-auto flex items-center gap-6 text-xs text-muted-foreground">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[11px] font-semibold uppercase tracking-wide">
                                                    {t('profile_page.followers')}
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {formatCount(user.followers_count)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[11px] font-semibold uppercase tracking-wide">
                                                    {t('profile_page.posts')}
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {formatCount(user.posts_count)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            {t('top_users.empty')}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

function formatCount(value?: number): string {
    const amount = Math.max(0, Math.floor(value ?? 0));
    if (amount < 1000) {
        return amount.toString();
    }

    const thousands = amount / 1000;
    const formatted = (Math.round(thousands * 10) / 10).toFixed(1).replace(/\.0$/, '');

    return `${formatted}k`;
}
