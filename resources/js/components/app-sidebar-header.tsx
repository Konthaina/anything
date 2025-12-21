import { Breadcrumbs } from '@/components/breadcrumbs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useI18n } from '@/contexts/language-context';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { Form, Link, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const page = usePage<SharedData & { filters?: { search?: string } }>();
    const { t } = useI18n();
    const searchKey =
        page.url.startsWith('/profiles') ? page.props.filters?.search ?? '' : '';

    return (
        <header className="grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="flex items-center justify-center">
                <Form
                    key={`user-search-${searchKey}`}
                    method="get"
                    action="/profiles"
                    data={{ search: searchKey }}
                    className="hidden md:flex"
                >
                    {({ setData }) => (
                        <div className="relative flex items-center">
                            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                name="search"
                                defaultValue={searchKey}
                                onChange={(event) => {
                                    setData('search', event.target.value);
                                }}
                                placeholder={t('header.search_placeholder')}
                                aria-label={t('header.search_placeholder')}
                                className="h-9 w-56 pl-9 text-sm"
                            />
                        </div>
                    )}
                </Form>
                <Link
                    href="/profiles"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
                    aria-label={t('common.search')}
                >
                    <Search className="h-4 w-4" />
                </Link>
            </div>
            <div className="flex items-center justify-end gap-2">
                <LanguageSwitcher size="sm" />
            </div>
        </header>
    );
}
