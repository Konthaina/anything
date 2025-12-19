import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { CreatePostCard, PostCard, type FeedPost } from '@/pages/feed/index';
import { follow, show as showProfile, unfollow } from '@/routes/profiles';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Form, Head, router, usePage, WhenVisible } from '@inertiajs/react';
import { useI18n } from '@/contexts/language-context';
import { Pencil } from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';

interface ProfileUser {
    id: number;
    name: string;
    avatar?: string | null;
    cover?: string | null;
    bio?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    posts_count?: number;
    followers_count?: number;
    following_count?: number;
    is_following?: boolean;
}

interface Paginated<T> {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    meta?: {
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
        per_page: number;
    };
}

interface ScrollMetadata {
    pageName: string;
    previousPage: number | string | null;
    nextPage: number | string | null;
    currentPage: number | string | null;
    reset?: boolean;
}

export default function ProfileShow() {
    const page = usePage<
        SharedData & {
            profile_user: ProfileUser;
            posts: Paginated<FeedPost>;
        }
    >();
    const { profile_user: profileUser, posts, auth } = page.props;
    const { t } = useI18n();
    const getInitials = useInitials();
    const postsData = posts?.data ?? [];
    const scrollProps = (page as typeof page & { scrollProps?: Record<string, ScrollMetadata> })
        .scrollProps;
    const postsScroll = scrollProps?.posts;
    const nextPostsPage = postsScroll?.nextPage ?? null;
    const postsPageName = postsScroll?.pageName ?? 'page';
    const hasMorePosts = nextPostsPage !== null;
    const postsCount = posts?.meta?.total ?? postsData.length;
    const isSelf = auth?.user?.id === profileUser.id;
    const authUserId = auth?.user?.id;
    const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
    const [isHoveringFollow, setIsHoveringFollow] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [bioDraft, setBioDraft] = useState<string | null>(null);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const isFollowing = Boolean(profileUser.is_following);
    const updatedAt = profileUser.updated_at ?? auth?.user?.updated_at ?? null;
    const hasProfileMediaChanges = Boolean(avatarPreview || coverPreview);
    const hasBioChanges =
        bioDraft !== null && bioDraft !== (profileUser.bio ?? '');
    const hasProfileChanges = hasProfileMediaChanges || hasBioChanges;

    const resetProfileMediaPreviews = () => {
        setAvatarPreview((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return null;
        });
        setCoverPreview((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return null;
        });
        setBioDraft(null);
        setIsEditingBio(false);
    };

    useEffect(() => {
        return () => {
            if (avatarPreview) {
                URL.revokeObjectURL(avatarPreview);
            }
            if (coverPreview) {
                URL.revokeObjectURL(coverPreview);
            }
        };
    }, [avatarPreview, coverPreview]);

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        setAvatarPreview((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }

            return file ? URL.createObjectURL(file) : null;
        });
    };

    const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        setCoverPreview((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }

            return file ? URL.createObjectURL(file) : null;
        });
    };

    const avatarSrc = useMemo(() => {
        if (avatarPreview) {
            return avatarPreview;
        }

        return appendCacheBuster(profileUser.avatar ?? null, updatedAt);
    }, [avatarPreview, profileUser.avatar, updatedAt]);

    const coverSrc = useMemo(() => {
        if (coverPreview) {
            return coverPreview;
        }

        return appendCacheBuster(profileUser.cover ?? null, updatedAt);
    }, [coverPreview, profileUser.cover, updatedAt]);

    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [
            { title: t('profile_page.title'), href: showProfile(profileUser.id).url },
        ],
        [profileUser.id, t],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${profileUser.name} · ${t('profile_page.title')}`} />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 pb-10">
                <Card className="border-border bg-card text-foreground shadow-xl">
                    <CardHeader className="space-y-4">
                        {isSelf ? (
                            <Form
                                {...ProfileController.update.form()}
                                options={{ preserveScroll: true }}
                                encType="multipart/form-data"
                                className="space-y-4"
                                onSuccess={() => {
                                    resetProfileMediaPreviews();
                                }}
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <input
                                            type="hidden"
                                            name="name"
                                            defaultValue={auth?.user?.name ?? profileUser.name}
                                        />
                                        <input
                                            type="hidden"
                                            name="email"
                                            defaultValue={auth?.user?.email}
                                        />

                                        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/10">
                                            <div className="h-36 w-full sm:h-44">
                                                {coverSrc ? (
                                                    <img
                                                        src={coverSrc}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <PlaceholderPattern className="size-full stroke-foreground/10" />
                                                )}
                                            </div>
                                            <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-background">
                                                {t('profile_page.cover_change')}
                                                <Input
                                                    type="file"
                                                    name="cover"
                                                    accept="image/*"
                                                    onChange={handleCoverChange}
                                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                                />
                                            </label>
                                        </div>

                                        <div className="relative -mt-8 flex flex-col gap-4 sm:-mt-10">
                                            <div className="flex flex-wrap items-end justify-between gap-4">
                                                <div className="flex items-end gap-4">
                                                    <label className="relative cursor-pointer">
                                                        <Avatar className="h-20 w-20 ring-2 ring-background sm:h-24 sm:w-24">
                                                            <AvatarImage
                                                                src={avatarSrc ?? undefined}
                                                                alt={profileUser.name}
                                                            />
                                                            <AvatarFallback className="bg-muted text-foreground">
                                                                {getInitials(profileUser.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <Input
                                                            type="file"
                                                            name="avatar"
                                                            accept="image/*"
                                                            onChange={handleAvatarChange}
                                                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                                        />
                                                    </label>
                                                    <div className="space-y-1">
                                                        <CardTitle className="text-xl font-semibold">
                                                            {profileUser.name}
                                                        </CardTitle>
                                                        {profileUser.created_at && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {t('profile_page.joined', {
                                                                    date: formatDate(profileUser.created_at),
                                                                })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {hasProfileChanges && (
                                                    <div className="flex items-center gap-2">
                                                        <Button type="submit" disabled={processing}>
                                                            {t('common.save')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            onClick={resetProfileMediaPreviews}
                                                            disabled={processing}
                                                        >
                                                            {t('common.cancel')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="w-full">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {t('profile_page.bio_label')}
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isEditingBio) {
                                                                setIsEditingBio(false);
                                                                setBioDraft(null);
                                                                return;
                                                            }

                                                            setIsEditingBio(true);
                                                            setBioDraft(profileUser.bio ?? '');
                                                        }}
                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                                        aria-label={t('common.edit')}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                {isEditingBio ? (
                                                    <>
                                                        <textarea
                                                            name="bio"
                                                            value={bioDraft ?? ''}
                                                            onChange={(event) =>
                                                                setBioDraft(event.target.value)
                                                            }
                                                            rows={4}
                                                            placeholder={t('profile_page.bio_placeholder')}
                                                            className="no-scrollbar mt-2 w-full resize-none overflow-auto rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                                        />
                                                        <p className="mt-2 text-[11px] text-muted-foreground">
                                                            {t('profile_page.bio_limit')}
                                                        </p>
                                                        <InputError className="mt-1" message={errors.bio} />
                                                    </>
                                                ) : (
                                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                                        {renderBioContent(
                                                            profileUser.bio ?? '',
                                                            t('profile_page.bio_placeholder'),
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-6 border-t border-border/60 pt-3 text-sm">
                                                <ProfileStat
                                                    label={t('profile_page.posts')}
                                                    value={profileUser.posts_count ?? postsCount}
                                                />
                                                <ProfileStat
                                                    label={t('profile_page.followers')}
                                                    value={profileUser.followers_count ?? 0}
                                                />
                                                <ProfileStat
                                                    label={t('profile_page.following')}
                                                    value={profileUser.following_count ?? 0}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-1 text-xs text-destructive">
                                            <InputError message={errors.avatar} />
                                            <InputError message={errors.cover} />
                                        </div>
                                    </>
                                )}
                            </Form>
                        ) : (
                            <>
                                <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/10">
                                    <div className="h-36 w-full sm:h-44">
                                        {coverSrc ? (
                                            <img
                                                src={coverSrc}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <PlaceholderPattern className="size-full stroke-foreground/10" />
                                        )}
                                    </div>
                                </div>

                                <div className="relative -mt-8 flex flex-col gap-4 sm:-mt-10">
                                    <div className="flex flex-wrap items-end justify-between gap-4">
                                        <div className="flex items-end gap-4">
                                            <Avatar className="h-20 w-20 ring-2 ring-background sm:h-24 sm:w-24">
                                                <AvatarImage
                                                    src={avatarSrc ?? undefined}
                                                    alt={profileUser.name}
                                                />
                                                <AvatarFallback className="bg-muted text-foreground">
                                                    {getInitials(profileUser.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl font-semibold">
                                                    {profileUser.name}
                                                </CardTitle>
                                                {profileUser.created_at && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('profile_page.joined', {
                                                            date: formatDate(profileUser.created_at),
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {!isSelf && (
                                            <Button
                                                type="button"
                                                variant={isFollowing ? 'secondary' : 'default'}
                                                disabled={isFollowSubmitting}
                                                onMouseEnter={() => {
                                                    if (!isFollowing) return;
                                                    setIsHoveringFollow(true);
                                                }}
                                                onMouseLeave={() => setIsHoveringFollow(false)}
                                                onBlur={() => setIsHoveringFollow(false)}
                                                onClick={() => {
                                                    if (isFollowSubmitting) return;
                                                    if (isFollowing) {
                                                        setIsConfirmOpen(true);
                                                        return;
                                                    }

                                                    setIsFollowSubmitting(true);
                                                    router.post(
                                                        follow(profileUser.id).url,
                                                        {},
                                                        {
                                                            preserveScroll: true,
                                                            onFinish: () =>
                                                                setIsFollowSubmitting(false),
                                                        },
                                                    );
                                                }}
                                            >
                                                {isFollowing
                                                    ? isHoveringFollow
                                                        ? t('profile_page.unfollow')
                                                        : t('profile_page.following')
                                                    : t('profile_page.follow')}
                                            </Button>
                                        )}
                                    </div>
                                    <div className="w-full">
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {t('profile_page.bio_label')}
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                            {renderBioContent(
                                                profileUser.bio ?? '',
                                                t('profile_page.bio_placeholder'),
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-6 border-t border-border/60 pt-3 text-sm">
                                        <ProfileStat
                                            label={t('profile_page.posts')}
                                            value={profileUser.posts_count ?? postsCount}
                                        />
                                        <ProfileStat
                                            label={t('profile_page.followers')}
                                            value={profileUser.followers_count ?? 0}
                                        />
                                        <ProfileStat
                                            label={t('profile_page.following')}
                                            value={profileUser.following_count ?? 0}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </CardHeader>
                </Card>

                <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {t('profile_page.unfollow_title', { name: profileUser.name })}
                            </DialogTitle>
                            <DialogDescription>
                                {t('profile_page.unfollow_description', {
                                    name: profileUser.name,
                                })}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button variant="ghost" type="button">
                                    {t('common.cancel')}
                                </Button>
                            </DialogClose>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isFollowSubmitting}
                                onClick={() => {
                                    if (isFollowSubmitting) return;
                                    setIsFollowSubmitting(true);
                                    router.delete(unfollow(profileUser.id).url, {
                                        preserveScroll: true,
                                        onSuccess: () => setIsConfirmOpen(false),
                                        onFinish: () => setIsFollowSubmitting(false),
                                    });
                                }}
                            >
                                {t('profile_page.unfollow_confirm', { name: profileUser.name })}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="space-y-4">
                    {isSelf && auth?.user && (
                        <CreatePostCard
                            currentUser={{
                                id: auth.user.id,
                                name: auth.user.name,
                                email: auth.user.email,
                                avatar: auth.user.avatar ?? null,
                            }}
                            getInitials={getInitials}
                        />
                    )}
                    {postsData.map((post) => (
                        <PostCard
                            key={`profile-post-${post.id}`}
                            post={post}
                            getInitials={getInitials}
                            authUserId={authUserId}
                        />
                    ))}

                    {postsData.length === 0 && (
                        <Card className="border-border bg-card text-foreground shadow-lg">
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                {t('profile_page.empty')}
                            </CardContent>
                        </Card>
                    )}

                    {hasMorePosts && (
                        <WhenVisible
                            key={`profile-page-${nextPostsPage}`}
                            params={{
                                data: { [postsPageName]: nextPostsPage },
                                only: ['posts'],
                                preserveUrl: true,
                            }}
                            buffer={240}
                            fallback={
                                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                                    {t('common.loading')}
                                </div>
                            }
                        >
                            {null}
                        </WhenVisible>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex flex-col items-start">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="text-lg font-semibold text-foreground">{value}</span>
        </div>
    );
}

function formatDate(value: string): string {
    const date = new Date(value);
    return date.toLocaleDateString();
}

function appendCacheBuster(url?: string | null, updatedAt?: string | null): string | null {
    if (!url) {
        return null;
    }

    if (!updatedAt) {
        return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(updatedAt)}`;
}

const BIO_URL_REGEX = /\bhttps?:\/\/[^\s]+/gi;

function renderBioContent(value: string, placeholder: string): React.ReactNode {
    const text = value.trim() ? value : placeholder;
    const lines = text.split('\n');

    return lines.map((line, index) => (
        <span key={`bio-line-${index}`}>
            {renderBioLineWithLinks(line, index)}
            {index < lines.length - 1 && <br />}
        </span>
    ));
}

function renderBioLineWithLinks(
    line: string,
    index: number,
): React.ReactNode[] | React.ReactNode {
    BIO_URL_REGEX.lastIndex = 0;

    const fragments: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = BIO_URL_REGEX.exec(line))) {
        const url = match[0];
        const start = match.index;

        if (start > lastIndex) fragments.push(line.slice(lastIndex, start));

        fragments.push(
            <a
                key={`bio-link-${index}-${start}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 underline transition hover:text-blue-400 dark:text-blue-300"
            >
                {url}
            </a>,
        );

        lastIndex = start + url.length;
    }

    if (lastIndex < line.length) fragments.push(line.slice(lastIndex));

    return fragments.length === 0 ? line : fragments;
}
