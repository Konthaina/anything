import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/contexts/language-context';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { show as showProfile } from '@/routes/profiles';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { BadgeCheck } from 'lucide-react';
import { useMemo } from 'react';

interface UserResult {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    is_verified?: boolean;
}

export default function ProfilesIndex() {
    const { users, filters } = usePage<
        SharedData & {
            users: UserResult[];
            filters?: { search?: string };
        }
    >().props;
    const { t } = useI18n();
    const getInitials = useInitials();
    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [{ title: t('common.users'), href: '/profiles' }],
        [t],
    );
    const search = filters?.search ?? '';
    const hasResults = users.length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('common.users')} />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-lg font-semibold text-foreground">
                        {t('common.users')}
                    </h1>
                    {search && (
                        <p className="text-sm text-muted-foreground">
                            {t('common.search')}: <span className="font-semibold text-foreground">{search}</span>
                        </p>
                    )}
                </div>

                {hasResults ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {users.map((user) => (
                            <Link
                                key={user.id}
                                href={showProfile(user.id)}
                                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/40 hover:bg-muted/40"
                            >
                                <Avatar className="h-11 w-11">
                                    <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
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
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            {t('common.empty_state')}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
