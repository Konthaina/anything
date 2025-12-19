import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { getEchoInstance } from '@/lib/echo-client';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/language-context';
import { type AppNotification, type BreadcrumbItem, type SharedData } from '@/types';
import { Form, Head, router, useForm, usePage, WhenVisible } from '@inertiajs/react';
import {
    ArrowUp,
    Bell,
    ChevronLeft,
    ChevronRight,
    Edit3,
    Globe2,
    Heart,
    Image as ImageIcon,
    MessageSquare,
    MoreHorizontal,
    Share2,
    Trash2,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface FeedUser {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
}

interface FeedPost {
    id: number | string;
    content: string;
    image_urls?: string[];
    likes_count: number;
    comments_count: number;
    shares_count: number;
    created_at: string;
    user: FeedUser;
    liked?: boolean;
    shared?: boolean;
    shared_post?: FeedPost | null;
    comments?: FeedComment[];
}

interface FeedComment {
    id: number | string;
    content: string;
    created_at: string;
    user: FeedUser;
    parent_id?: number | null;
    replies?: FeedComment[];
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

interface UserNotificationCreatedPayload {
    notification?: AppNotification;
}

interface PostLikesUpdatedPayload {
    post_id: number | string;
    likes_count?: number;
}

interface PostCommentCreatedPayload {
    post_id: number | string;
    comments_count?: number;
    comment?: FeedComment;
}

interface PostSharedPayload {
    post_id: number | string;
    shares_count?: number;
    shared_by?: number | string;
}

interface PostCreatedPayload {
    post?: FeedPost;
}

interface PostUpdatedPayload {
    post?: FeedPost;
}

interface PostDeletedPayload {
    post_id?: number | string;
}

function safeId() {
    return (
        (typeof crypto !== 'undefined' &&
            typeof crypto.randomUUID === 'function' &&
            crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
}

function normalizeComment(comment?: Partial<FeedComment>): FeedComment {
    return {
        id: comment?.id ?? safeId(),
        content: comment?.content ?? '',
        created_at: comment?.created_at ?? new Date().toISOString(),
        user: comment?.user ?? {
            id: 0,
            name: 'Unknown',
            email: '',
            avatar: null,
        },
        parent_id: comment?.parent_id ?? null,
        replies: (comment?.replies ?? []).map((reply) => normalizeComment(reply)),
    };
}

function normalizePost(post?: Partial<FeedPost>, includeShared = true): FeedPost {
    return {
        id: post?.id ?? safeId(),
        content: post?.content ?? '',
        image_urls: post?.image_urls ?? [],
        likes_count: post?.likes_count ?? 0,
        comments_count: post?.comments_count ?? 0,
        shares_count: post?.shares_count ?? 0,
        created_at: post?.created_at ?? new Date().toISOString(),
        user: post?.user ?? {
            id: 0,
            name: 'Unknown',
            email: '',
            avatar: null,
        },
        liked: Boolean(post?.liked),
        shared: Boolean(post?.shared),
        shared_post:
            includeShared && post?.shared_post
                ? normalizePost(post.shared_post as FeedPost, false)
                : undefined,
        comments: (post?.comments ?? []).map((comment) => normalizeComment(comment)),
    };
}

function mergeFeedPosts(current: FeedPost[], incoming: FeedPost[]): FeedPost[] {
    if (incoming.length === 0) {
        return current;
    }

    const indexById = new Map(current.map((post, index) => [String(post.id), index]));
    const next = [...current];

    incoming.forEach((post) => {
        const key = String(post.id);
        const existingIndex = indexById.get(key);

        if (existingIndex !== undefined) {
            const existing = next[existingIndex];
            next[existingIndex] = {
                ...post,
                liked: existing?.liked,
                shared: existing?.shared,
                comments: existing?.comments,
            };
            return;
        }

        indexById.set(key, next.length);
        next.push(post);
    });

    return next;
}

function sanitizeImageUrls(urls?: string[] | null): string[] {
    return (urls ?? []).filter((url) => url && !url.includes('via.placeholder.com'));
}

function resolveImageGridClass(count: number): string {
    if (count === 1) {
        return 'grid-cols-1';
    }

    if (count === 2) {
        return 'grid-cols-2';
    }

    return 'grid-cols-2 sm:grid-cols-3';
}

function idsAreEqual(a?: number | string | null, b?: number | string | null): boolean {
    if (a === undefined || a === null || b === undefined || b === null) {
        return false;
    }

    return String(a) === String(b);
}

const MAX_IMAGES = 7;

export default function FeedPage() {
    const page = usePage<
        SharedData & {
            posts?: Paginated<FeedPost>;
            notifications?: AppNotification[];
            notifications_unread_count?: number;
        }
    >();
    const {
        posts: pagePosts,
        auth,
        notifications: pageNotifications,
        notifications_unread_count: notificationsUnreadCount,
    } = page.props;
    const scrollProps = (page as typeof page & { scrollProps?: Record<string, ScrollMetadata> })
        .scrollProps;
    const postsScroll = scrollProps?.posts;
    const nextPostsPage = postsScroll?.nextPage ?? null;
    const postsPageName = postsScroll?.pageName ?? 'page';
    const currentPostsPage =
        postsScroll?.currentPage ?? pagePosts?.meta?.current_page ?? 1;
    const hasMorePosts = nextPostsPage !== null;
    const posts = useMemo(() => {
        return (pagePosts?.data ?? []).filter((post): post is FeedPost => Boolean(post));
    }, [pagePosts]);
    const normalizedInitialPosts = useMemo<FeedPost[]>(() => {
        return posts.map((post) => normalizePost(post));
    }, [posts]);
    const [livePosts, setLivePosts] = useState<FeedPost[]>(normalizedInitialPosts);
    const notifications = useMemo(() => pageNotifications ?? [], [pageNotifications]);
    const unreadNotificationCount = notificationsUnreadCount ?? 0;
    const authUserId = auth?.user?.id;
    const { t } = useI18n();

    const [liveNotifications, setLiveNotifications] = useState<AppNotification[]>(notifications);
    const [liveUnreadNotifications, setLiveUnreadNotifications] = useState<number>(
        unreadNotificationCount,
    );
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        if (currentPostsPage <= 1) {
            setLivePosts(normalizedInitialPosts);
            return;
        }

        setLivePosts((current) => mergeFeedPosts(current, normalizedInitialPosts));
    }, [currentPostsPage, normalizedInitialPosts]);

    useEffect(() => {
        setLiveNotifications(notifications);
    }, [notifications]);

    useEffect(() => {
        setLiveUnreadNotifications(unreadNotificationCount);
    }, [unreadNotificationCount]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [{ title: t('feed.title'), href: '/feed' }],
        [t],
    );

    const getInitials = useInitials();

    useEffect(() => {
        const echo = getEchoInstance();
        if (!echo) return;

        const channelName = 'posts';
        const channel = echo.channel(channelName);

        const handleCreated = (payload: PostCreatedPayload) => {
            const incoming = payload?.post;
            if (!incoming) return;

            const normalized = normalizePost(incoming);

            setLivePosts((current) => {
                const exists = current.some((post) => idsAreEqual(post.id, normalized.id));
                if (exists) {
                    return current.map((post) =>
                        idsAreEqual(post.id, normalized.id)
                            ? {
                                ...normalized,
                                liked: post.liked,
                                shared: post.shared,
                                comments: post.comments,
                            }
                            : post,
                    );
                }

                return [normalized, ...current];
            });
        };

        const handleUpdated = (payload: PostUpdatedPayload) => {
            const incoming = payload?.post;
            if (!incoming) return;

            const normalized = normalizePost(incoming);

            setLivePosts((current) =>
                current.map((post) =>
                    idsAreEqual(post.id, normalized.id)
                        ? {
                            ...normalized,
                            liked: post.liked,
                            shared: post.shared,
                            comments: post.comments,
                        }
                        : post,
                ),
            );
        };

        const handleDeleted = (payload: PostDeletedPayload) => {
            const postId = payload?.post_id;
            if (!postId) return;

            setLivePosts((current) => current.filter((post) => !idsAreEqual(post.id, postId)));
        };

        const handleShared = (payload: PostSharedPayload) => {
            if (!payload || payload.post_id === undefined || payload.post_id === null) {
                return;
            }

            setLivePosts((current) =>
                current.map((post) => {
                    let next = post;

                    if (idsAreEqual(post.id, payload.post_id)) {
                        next = {
                            ...next,
                            shares_count: payload.shares_count ?? post.shares_count,
                        };
                    }

                    if (post.shared_post && idsAreEqual(post.shared_post.id, payload.post_id)) {
                        next = {
                            ...next,
                            shared_post: {
                                ...post.shared_post,
                                shares_count: payload.shares_count ?? post.shared_post.shares_count,
                            },
                        };
                    }

                    return next;
                }),
            );
        };

        channel.listen('.PostCreated', handleCreated);
        channel.listen('.PostUpdated', handleUpdated);
        channel.listen('.PostDeleted', handleDeleted);
        channel.listen('.PostShared', handleShared);

        return () => {
            channel.stopListening('.PostCreated');
            channel.stopListening('.PostUpdated');
            channel.stopListening('.PostDeleted');
            channel.stopListening('.PostShared');
            echo.leaveChannel(channelName);
        };
    }, []);

    useEffect(() => {
        if (!authUserId) return;

        const echo = getEchoInstance();
        if (!echo) return;

        const channelName = `notifications.${authUserId}`;
        const channel =
            typeof echo.private === 'function' ? echo.private(channelName) : echo.channel(channelName);

        const handleNotification = (payload: UserNotificationCreatedPayload) => {
            const notification = payload?.notification;
            if (!notification) return;

            setLiveNotifications((current) => {
                const filtered = current.filter((item) => item.id !== notification.id);
                return [notification, ...filtered].slice(0, 10);
            });

            if (!notification.read_at) {
                setLiveUnreadNotifications((count) => count + 1);
            }
        };

        channel.listen('.UserNotificationCreated', handleNotification);

        return () => {
            channel.stopListening('.UserNotificationCreated');
            echo.leave(channelName);
        };
    }, [authUserId]);

    const handleMarkAllNotificationsRead = useCallback(() => {
        if (!liveUnreadNotifications) return;

        router.post(
            '/notifications/read-all',
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    const nowIso = new Date().toISOString();
                    setLiveNotifications((current) =>
                        current.map((notification) => ({
                            ...notification,
                            read_at: notification.read_at ?? nowIso,
                        })),
                    );
                    setLiveUnreadNotifications(0);
                },
            },
        );
    }, [liveUnreadNotifications]);

    const handleScrollTopClick = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('feed.title')} />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 pb-10">
                {auth?.user && (
                    <CreatePostCard currentUser={auth.user as FeedUser} getInitials={getInitials} />
                )}

                <div className="space-y-4">
                    {livePosts.map((post) => {
                        const imageSignature = (post.image_urls ?? []).join('|');
                        const commentsSignature = (post.comments ?? [])
                            .map((comment) => comment.id)
                            .join('|');
                        const postSignature = [
                            post.id,
                            post.likes_count ?? 0,
                            post.comments_count ?? 0,
                            post.shares_count ?? 0,
                            commentsSignature,
                        ].join('|');
                        return (
                            <PostCard
                                key={`${postSignature}-${imageSignature}`}
                                post={post}
                                getInitials={getInitials}
                                authUserId={authUserId}
                            />
                        );
                    })}

                    {livePosts.length === 0 && (
                        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
                            <CardContent className="py-10 text-center text-sm text-slate-400">
                                {t('feed.empty')}
                            </CardContent>
                        </Card>
                    )}

                    {hasMorePosts && (
                        <WhenVisible
                            key={`feed-page-${nextPostsPage}`}
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

                {auth?.user && (
                    <NotificationFloatingButton
                        notifications={liveNotifications}
                        unreadCount={liveUnreadNotifications}
                        onMarkAllRead={handleMarkAllNotificationsRead}
                    />
                )}

                {showScrollTop && (
                    <ScrollToTopButton label={t('feed.scroll_to_top')} onClick={handleScrollTopClick} />
                )}
            </div>
        </AppLayout>
    );
}

function CreatePostCard({
    currentUser,
    getInitials,
}: {
    currentUser: FeedUser;
    getInitials: (value?: string | null) => string;
}) {
    const { t } = useI18n();
    const [content, setContent] = useState<string>('');
    const [previews, setPreviews] = useState<string[]>([]);
    const previewUrlsRef = useRef<string[]>([]);

    const cleanupPreviews = () => {
        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewUrlsRef.current = [];
        setPreviews([]);
    };

    useEffect(() => {
        return () => cleanupPreviews();

    }, []);

    return (
        <Card className="border-border bg-card text-foreground shadow-xl">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <Avatar className="h-11 w-11">
                    <AvatarImage src={currentUser.avatar ?? undefined} alt={currentUser.name} />
                    <AvatarFallback className="bg-muted text-foreground">
                        {getInitials(currentUser.name)}
                    </AvatarFallback>
                </Avatar>
                <CardTitle className="text-base font-semibold leading-tight">
                    {t('feed.create_title')}
                </CardTitle>
            </CardHeader>

            <Form
                method="post"
                action="/feed"
                encType="multipart/form-data"
                onSuccess={() => {
                    cleanupPreviews();
                    setContent('');
                }}
            >
                {({ setData, processing, errors, reset }) => {
                    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                        const files = Array.from(event.target.files ?? []).slice(0, MAX_IMAGES);
                        setData?.('images', files);

                        cleanupPreviews();

                        if (files.length === 0) return;

                        const urls = files.map((file) => URL.createObjectURL(file));
                        previewUrlsRef.current = urls;
                        setPreviews(urls);
                    };

                    return (
                        <>
                            <CardContent className="space-y-4">
                                <textarea
                                    name="content"
                                    value={content}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setContent(next);
                                        setData?.('content', next);
                                    }}
                                    placeholder={t('feed.placeholder')}
                                    className="min-h-[140px] w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/60"
                                />
                                <InputError message={errors.content} />

                                <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <ImageIcon className="h-4 w-4" />
                                        <span>{t('feed.attach_image')}</span>
                                    </div>
                                    <label className="relative inline-flex cursor-pointer items-center rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:opacity-90">
                                        <span>{t('feed.browse')}</span>
                                        <input
                                            type="file"
                                            name="images[]"
                                            accept="image/*"
                                            multiple
                                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>

                                <InputError message={errors.images} />

                                {previews.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {previews.map((src) => (
                                            <div key={src} className="overflow-hidden rounded-xl border border-border">
                                                <img src={src} alt="Preview" className="w-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="flex items-center justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-foreground hover:bg-muted"
                                    onClick={() => {
                                        reset?.();
                                        cleanupPreviews();
                                        setContent('');
                                        setData?.('images', []);
                                    }}
                                    disabled={processing}
                                >
                                    {t('feed.clear')}
                                </Button>

                                <Button type="submit" disabled={processing}>
                                    {t('feed.post')}
                                </Button>
                            </CardFooter>
                        </>
                    );
                }}
            </Form>
        </Card>
    );
}

function PostCard({
    post,
    getInitials,
    authUserId,
}: {
    post: FeedPost;
    getInitials: (value?: string | null) => string;
    authUserId?: number;
}) {
    const { t } = useI18n();

    const [likeProcessing, setLikeProcessing] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [hiddenImages, setHiddenImages] = useState<string[]>([]);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [lightboxState, setLightboxState] = useState<{
        images: string[];
        index: number;
    } | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);

    const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
    const [optimisticLikesCount, setOptimisticLikesCount] = useState<number | null>(null);
    const [liveLikesCount, setLiveLikesCount] = useState(post.likes_count ?? 0);
    const [liveCommentsCount, setLiveCommentsCount] = useState(post.comments_count ?? 0);
    const [liveComments, setLiveComments] = useState<FeedComment[]>(post.comments ?? []);
    const [liveSharesCount, setLiveSharesCount] = useState(post.shares_count ?? 0);
    const [hasShared, setHasShared] = useState(Boolean(post.shared));
    const [shareProcessing, setShareProcessing] = useState(false);
    const shareForm = useForm<{ content: string }>({
        content: '',
    });

    const liked = optimisticLiked ?? Boolean(post.liked);
    const likesCount = optimisticLikesCount ?? liveLikesCount;

    const comments = liveComments;
    const commentsCount = liveCommentsCount;
    const sharesCount = liveSharesCount;

    const isAuthor = authUserId !== undefined && authUserId === post.user.id;
    const timestamp = useMemo(() => formatRelativeTime(post.created_at), [post.created_at]);

    const sanitizedImageUrls = useMemo(() => sanitizeImageUrls(post.image_urls), [post.image_urls]);

    const visibleImageUrls = sanitizedImageUrls.filter((url) => !hiddenImages.includes(url));
    const imageGridClass = resolveImageGridClass(visibleImageUrls.length);
    const sharedPost = post.shared_post ?? null;
    const contentLines = useMemo(() => (post.content ?? '').split('\n'), [post.content]);
    const hasContent = contentLines.some((line) => line.trim().length > 0);
    const openLightbox = useCallback((images: string[], index: number) => {
        if (images.length === 0) return;

        const safeIndex = Math.min(Math.max(index, 0), images.length - 1);
        setLightboxState({ images, index: safeIndex });
    }, []);
    const lightboxKey = lightboxState
        ? `lightbox-${post.id}-${lightboxState.index}-${lightboxState.images.length}`
        : `lightbox-${post.id}-closed`;

    const mergeIncomingComment = useCallback(
        (incoming?: FeedComment) => {
            if (!incoming) return;

            const normalized = normalizeComment(incoming);
            setLiveComments((current) => {
                if (normalized.parent_id !== undefined && normalized.parent_id !== null) {
                    return current.map((comment) => {
                        if (idsAreEqual(comment.id, normalized.parent_id)) {
                            const replies = comment.replies ?? [];
                            const alreadyExists = replies.some((reply) => idsAreEqual(reply.id, normalized.id));

                            return {
                                ...comment,
                                replies: alreadyExists ? replies : [normalized, ...replies],
                            };
                        }
                        return comment;
                    });
                }

                const exists = current.some((comment) => idsAreEqual(comment.id, normalized.id));

                if (exists) {
                    return current.map((comment) =>
                        idsAreEqual(comment.id, normalized.id) ? normalized : comment,
                    );
                }

                return [normalized, ...current];
            });
        },
        [],
    );

    useEffect(() => {
        const echo = getEchoInstance();
        if (!echo) return;

        const channelName = `posts.${post.id}`;
        const channel = echo.channel(channelName);

        const handleLikes = (payload: PostLikesUpdatedPayload) => {
            if (!payload || !idsAreEqual(payload.post_id, post.id)) return;
            setLiveLikesCount(Math.max(0, payload.likes_count ?? 0));
            setOptimisticLikesCount(null);
        };

        const handleComments = (payload: PostCommentCreatedPayload) => {
            if (!payload || !idsAreEqual(payload.post_id, post.id)) return;
            setLiveCommentsCount(Math.max(0, payload.comments_count ?? 0));
            mergeIncomingComment(payload.comment);
        };

        const handleShares = (payload: PostSharedPayload) => {
            if (!payload || !idsAreEqual(payload.post_id, post.id)) return;
            setLiveSharesCount(Math.max(0, payload.shares_count ?? 0));

            if (
                payload.shared_by !== undefined &&
                payload.shared_by !== null &&
                authUserId !== undefined &&
                idsAreEqual(payload.shared_by, authUserId)
            ) {
                setHasShared(true);
            }
        };

        channel.listen('.PostLikesUpdated', handleLikes);
        channel.listen('.PostCommentCreated', handleComments);
        channel.listen('.PostShared', handleShares);

        return () => {
            channel.stopListening('.PostLikesUpdated');
            channel.stopListening('.PostCommentCreated');
            channel.stopListening('.PostShared');
            echo.leaveChannel(channelName);
        };
    }, [post.id, mergeIncomingComment, authUserId]);

    const handleShareDialogChange = (open: boolean) => {
        if (shareProcessing) return;
        setShareDialogOpen(open);

        if (!open) {
            shareForm.reset();
            shareForm.clearErrors();
        }
    };

    const handleShareNoteChange = (value: string) => {
        shareForm.setData('content', value);

        if (shareForm.errors.content) {
            shareForm.clearErrors('content');
        }
    };

    const handleShareClick = () => {
        if (shareProcessing) return;
        setShareDialogOpen(true);
    };

    const handleLikeToggle = () => {
        if (likeProcessing) return;

        const prevLiked = liked;
        const prevCount = likesCount;

        const nextLiked = !prevLiked;
        const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

        setLikeProcessing(true);
        setOptimisticLiked(nextLiked);
        setOptimisticLikesCount(nextCount);

        router.post(
            `/feed/${post.id}/like`,
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const updatedPosts = (page.props as { posts?: Paginated<FeedPost> } | undefined)
                        ?.posts?.data;
                    const updatedPost = updatedPosts?.find((item) => item.id === post.id);

                    // if server gave updated props, drop optimism
                    if (updatedPost) {
                        setOptimisticLiked(null);
                        setOptimisticLikesCount(null);
                    }
                },
                onError: () => {
                    setOptimisticLiked(null);
                    setOptimisticLikesCount(null);
                },
                onFinish: () => setLikeProcessing(false),
            },
        );
    };

    const handleShareSubmit = () => {
        if (shareProcessing) return;

        const previousCount = sharesCount;

        setShareProcessing(true);
        setLiveSharesCount(previousCount + 1);

        shareForm.post(`/feed/${post.id}/share`, {
            preserveScroll: true,
            onSuccess: () => {
                setHasShared(true);
                shareForm.reset();
                shareForm.clearErrors();
                setShareDialogOpen(false);
            },
            onError: () => {
                setLiveSharesCount(previousCount);
            },
            onFinish: () => setShareProcessing(false),
        });
    };

    return (
        <Card className="overflow-hidden border-border bg-card text-foreground shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                        <AvatarImage src={post.user.avatar ?? undefined} alt={post.user.name} />
                        <AvatarFallback className="bg-muted text-foreground">
                            {getInitials(post.user.name)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col">
                        <div className="text-sm font-semibold leading-tight">{post.user.name}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{timestamp}</span>
                            <span>·</span>
                            <Globe2 className="h-3.5 w-3.5" />
                            <span>{t('feed.visibility.public')}</span>
                        </div>
                    </div>
                </div>

                {isAuthor && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                aria-label="More actions"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                onSelect={(event) => {
                                    event.preventDefault();
                                    setIsEditOpen(true);
                                }}
                            >
                                <Edit3 className="size-4" />
                                {t('feed.edit')}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={(event) => {
                                    event.preventDefault();
                                    setIsDeleteOpen(true);
                                }}
                            >
                                <Trash2 className="size-4" />
                                {t('feed.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>

            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground">
                {sharedPost ? (
                    <>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{post.user.name}</span>
                            <Share2 className="h-3 w-3 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{sharedPost.user.name}</span>
                        </div>

                        {hasContent &&
                            contentLines.map((line, idx) => (
                                <p key={`share-content-${idx}`}>{renderLineWithLinks(line, idx)}</p>
                            ))}

                        {visibleImageUrls.length > 0 && (
                            <div className={`grid w-full gap-2 ${imageGridClass}`}>
                                {visibleImageUrls.map((url, index) => (
                                    <button
                                        key={url}
                                        type="button"
                                        onClick={() => openLightbox(visibleImageUrls, index)}
                                        className="group overflow-hidden rounded-2xl border border-border transition hover:ring-0 focus-visible:outline-none focus-visible:ring-0"
                                    >
                                        <img
                                            src={url}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            onError={() => {
                                                setHiddenImages((prev) =>
                                                    prev.includes(url) ? prev : [...prev, url],
                                                );
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        <SharedPostPreview
                            post={sharedPost}
                            getInitials={getInitials}
                            onImageClick={openLightbox}
                        />
                    </>
                ) : (
                    <>
                        {contentLines.map((line, idx) => (
                            <p key={idx}>{renderLineWithLinks(line, idx)}</p>
                        ))}

                        {visibleImageUrls.length > 0 && (
                            <div className={`grid w-full gap-2 ${imageGridClass}`}>
                                {visibleImageUrls.map((url, index) => (
                                    <button
                                        key={url}
                                        type="button"
                                        onClick={() => openLightbox(visibleImageUrls, index)}
                                        className="group overflow-hidden rounded-2xl border border-border transition hover:ring-0 focus-visible:outline-none focus-visible:ring-0"
                                    >
                                        <img
                                            src={url}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            onError={() => {
                                                setHiddenImages((prev) =>
                                                    prev.includes(url) ? prev : [...prev, url],
                                                );
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[0.75rem]">
                        <span className="font-semibold text-foreground">
                            {formatCount(likesCount)} {t('feed.like')}
                        </span>

                        <div className="flex items-center gap-3 text-muted-foreground">
                            <span>
                                {formatCount(commentsCount)} {t('feed.comments')}
                            </span>
                            <span>
                                {formatCount(sharesCount)} {t('feed.shares')}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="border-t border-border/60 px-0 py-0">
                <div className="flex w-full divide-x divide-border/60 text-xs font-semibold uppercase text-muted-foreground">
                    <ActionButton
                        icon={Heart}
                        label={t('feed.like')}
                        onClick={handleLikeToggle}
                        active={liked}
                        disabled={likeProcessing}
                    />
                    <ActionButton
                        icon={MessageSquare}
                        label={t('feed.comment')}
                        onClick={() => setCommentsOpen((prev) => !prev)}
                        active={commentsOpen}
                    />
                    <ActionButton
                        icon={Share2}
                        label={t('feed.share')}
                        onClick={handleShareClick}
                        active={hasShared}
                        disabled={shareProcessing}
                    />
                </div>
            </CardFooter>

            {commentsOpen && (
                <CommentSection postId={post.id} comments={comments} getInitials={getInitials} />
            )}

            <EditPostDialog
                key={`edit-dialog-${post.id}-${isEditOpen ? 'open' : 'closed'}`}
                post={post}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
            />
            <DeletePostDialog postId={post.id} open={isDeleteOpen} onOpenChange={setIsDeleteOpen} />
            <ShareDialog
                open={shareDialogOpen}
                onOpenChange={handleShareDialogChange}
                value={shareForm.data.content}
                onChange={handleShareNoteChange}
                onSubmit={handleShareSubmit}
                submitting={shareProcessing}
                error={shareForm.errors.content}
            />

            <ImageViewerDialog
                key={lightboxKey}
                images={lightboxState?.images ?? []}
                startIndex={lightboxState?.index ?? 0}
                open={Boolean(lightboxState)}
                onOpenChange={(open) => {
                    if (!open) setLightboxState(null);
                }}
            />
        </Card>
    );
}

interface EditPostDialogProps {
    post: FeedPost;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function EditPostDialog({ post, open, onOpenChange }: EditPostDialogProps) {
    const { t } = useI18n();

    const form = useForm({
        content: post.content ?? '',
        images: [] as File[],
        remove_image: false,
    });

    const { setData, clearErrors } = form;
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const previewBlobRef = useRef<string[]>([]);
    const hiddenPreviewRef = useRef<Set<string>>(new Set());
    const [, rerender] = useState(0);
    const bump = () => rerender((v) => v + 1);

    const cleanupBlobUrls = () => {
        previewBlobRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewBlobRef.current = [];
    };

    useEffect(() => {
        // reset form fields when switching post or opening dialog
        setData({
            content: post.content ?? '',
            images: [],
            remove_image: false,
        });
        clearErrors();

        if (fileInputRef.current) fileInputRef.current.value = '';

        cleanupBlobUrls();
        hiddenPreviewRef.current = new Set();

        // NOTE: do not bump here (lint rule)
        // re-render will happen anyway when open/post.id changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [post.id, open]);

    useEffect(() => {
        return () => {
            cleanupBlobUrls();
        };

    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []).slice(0, MAX_IMAGES);

        setData('images', files);
        setData('remove_image', false);

        cleanupBlobUrls();
        hiddenPreviewRef.current = new Set();

        if (files.length === 0) {
            bump();
            return;
        }

        const urls = files.map((file) => URL.createObjectURL(file));
        previewBlobRef.current = urls;
        bump();
    };

    const handleRemoveImage = () => {
        const next = !form.data.remove_image;
        setData('remove_image', next);

        if (next) {
            setData('images', []);
            if (fileInputRef.current) fileInputRef.current.value = '';
            cleanupBlobUrls();
            hiddenPreviewRef.current = new Set();
        } else {
            hiddenPreviewRef.current = new Set();
        }

        bump();
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.put(`/feed/${post.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
            },
        });
    };

    const isSharePost = Boolean(post.shared_post);

    const previewSources = isSharePost
        ? []
        : form.data.remove_image
            ? []
            : previewBlobRef.current.length > 0
                ? previewBlobRef.current
                : post.image_urls ?? [];

    const visiblePreviewUrls = previewSources.filter((url) => !hiddenPreviewRef.current.has(url));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('feed.edit_title')}</DialogTitle>
                    <DialogDescription>{t('feed.edit_description')}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
                    <div className="space-y-2 text-sm">
                        <label htmlFor={`edit-content-${post.id}`} className="font-semibold">
                            {t('feed.placeholder')}
                        </label>

                        <textarea
                            id={`edit-content-${post.id}`}
                            name="content"
                            value={form.data.content}
                            onChange={(event) => form.setData('content', event.target.value)}
                            placeholder={t('feed.placeholder')}
                            className="min-h-[140px] w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/60"
                        />

                        <InputError message={form.errors.content} />
                    </div>

                    {!isSharePost && (
                        <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                                <span>{t('feed.attach_image')}</span>
                            </div>

                            <label className="relative inline-flex cursor-pointer items-center rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:opacity-90">
                                <span>{t('feed.browse')}</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    name="images[]"
                                    accept="image/*"
                                    multiple
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    onChange={handleFileChange}
                                />
                            </label>

                            <InputError message={form.errors.images} />

                            <div className="flex items-center justify-end">
                                <Button
                                    type="button"
                                    variant={form.data.remove_image ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={handleRemoveImage}
                                >
                                    {form.data.remove_image ? t('feed.clear_selection') : t('feed.remove_image')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isSharePost && visiblePreviewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {visiblePreviewUrls.map((url) => (
                                <div key={url} className="overflow-hidden rounded-xl border border-border">
                                    <img
                                        src={url}
                                        alt=""
                                        className="w-full object-cover"
                                        onError={() => {
                                            if (!hiddenPreviewRef.current.has(url)) {
                                                hiddenPreviewRef.current.add(url);
                                                bump();
                                            }
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">{t('common.cancel')}</Button>
                        </DialogClose>
                        <Button type="submit" disabled={form.processing}>
                            {t('feed.update')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface DeletePostDialogProps {
    postId: number | string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function DeletePostDialog({ postId, open, onOpenChange }: DeletePostDialogProps) {
    const { t } = useI18n();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('feed.delete_confirm_title')}</DialogTitle>
                    <DialogDescription>{t('feed.delete_confirm_description')}</DialogDescription>
                </DialogHeader>

                <Form
                    method="delete"
                    action={`/feed/${postId}`}
                    onSuccess={() => onOpenChange(false)}
                    className="grid gap-4"
                >
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">{t('common.cancel')}</Button>
                        </DialogClose>
                        <Button type="submit" variant="destructive">
                            {t('feed.delete_confirm')}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

interface CommentSectionProps {
    postId: number | string;
    comments: FeedComment[];
    getInitials: (value?: string | null) => string;
    onSubmitted?: () => void;
}

function CommentSection({ postId, comments, getInitials, onSubmitted }: CommentSectionProps) {
    const { t } = useI18n();

    const sortedComments = useMemo(() => {
        return [...(comments ?? [])].sort((a, b) => {
            const at = new Date(a.created_at ?? 0).getTime();
            const bt = new Date(b.created_at ?? 0).getTime();
            return bt - at;
        });
    }, [comments]);

    const hasComments = sortedComments.length > 0;

    return (
        <div className="border-t border-border/60 bg-muted/30 px-4 py-4">
            <CommentForm
                postId={postId}
                placeholder={t('feed.comment_placeholder')}
                submitLabel={t('feed.post_comment')}
                onSubmitted={() => onSubmitted?.()}
            />

            <div className="mt-4 space-y-4">
                {hasComments ? (
                    sortedComments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            postId={postId}
                            getInitials={getInitials}
                        />
                    ))
                ) : (
                    <p className="text-xs text-muted-foreground">{t('feed.no_comments')}</p>
                )}
            </div>
        </div>
    );
}

interface CommentItemProps {
    comment: FeedComment;
    postId: number | string;
    getInitials: (value?: string | null) => string;
}

function CommentItem({ comment, postId, getInitials }: CommentItemProps) {
    const { t } = useI18n();
    const [replyOpen, setReplyOpen] = useState(false);

    const replies = useMemo(() => {
        return [...(comment.replies ?? [])].sort((a, b) => {
            const at = new Date(a.created_at ?? 0).getTime();
            const bt = new Date(b.created_at ?? 0).getTime();
            return bt - at;
        });
    }, [comment.replies]);

    return (
        <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9">
                <AvatarImage src={comment.user.avatar ?? undefined} alt={comment.user.name} />
                <AvatarFallback className="bg-muted text-foreground">{getInitials(comment.user.name)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
                <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <div className="text-sm font-semibold leading-tight">{comment.user.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                                {formatRelativeTime(comment.created_at)}
                            </div>
                        </div>
                    </div>

                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {comment.content}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <button
                            type="button"
                            className="transition hover:text-primary"
                            onClick={() => setReplyOpen((prev) => !prev)}
                        >
                            {t('feed.reply')}
                        </button>
                    </div>
                </div>

                {replyOpen && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                        <CommentForm
                            postId={postId}
                            parentId={Number(comment.id)}
                            placeholder={t('feed.reply_placeholder')}
                            submitLabel={t('feed.post_reply')}
                            onSubmitted={() => setReplyOpen(false)}
                            onCancel={() => setReplyOpen(false)}
                            compact
                        />
                    </div>
                )}

                {replies.length > 0 && (
                    <div className="space-y-3 border-l border-border/60 pl-4">
                        {replies.map((reply) => (
                            <ReplyItem key={reply.id} reply={reply} getInitials={getInitials} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ReplyItem({
    reply,
    getInitials,
}: {
    reply: FeedComment;
    getInitials: (value?: string | null) => string;
}) {
    return (
        <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
                <AvatarImage src={reply.user.avatar ?? undefined} alt={reply.user.name} />
                <AvatarFallback className="bg-muted text-foreground">
                    {getInitials(reply.user.name)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold leading-tight">{reply.user.name}</div>
                    <div className="text-[11px] text-muted-foreground">{formatRelativeTime(reply.created_at)}</div>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground">{reply.content}</p>
            </div>
        </div>
    );
}

interface CommentFormProps {
    postId: number | string;
    parentId?: number | null;
    placeholder: string;
    submitLabel: string;
    onSubmitted?: () => void;
    onCancel?: () => void;
    compact?: boolean;
}

function CommentForm({
    postId,
    parentId = null,
    placeholder,
    submitLabel,
    onSubmitted,
    onCancel,
    compact = false,
}: CommentFormProps) {
    const { t } = useI18n();

    const form = useForm({
        content: '',
        parent_id: parentId ?? null,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.setData('parent_id', parentId ?? null);

        form.post(`/feed/${postId}/comments`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                form.reset('content');
                form.clearErrors();
                onSubmitted?.();
            },
        });
    };

    const disabled = form.processing || !form.data.content.trim();

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
                value={form.data.content}
                onChange={(event) => form.setData('content', event.target.value)}
                placeholder={placeholder}
                rows={compact ? 2 : 3}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
            <InputError message={form.errors.content} />

            <div className="flex items-center justify-end gap-2">
                {onCancel && (
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={form.processing}>
                        {t('common.cancel')}
                    </Button>
                )}
                <Button type="submit" size="sm" disabled={disabled}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}

interface ImageViewerDialogProps {
    images: string[];
    startIndex: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function ImageViewerDialog({
    images,
    startIndex,
    open,
    onOpenChange,
}: ImageViewerDialogProps) {
    const { t } = useI18n();
    const minZoom = 1;
    const maxZoom = 3;
    const step = 0.25;
    const clickZoom = 2;
    const maxIndex = Math.max(0, images.length - 1);
    const safeIndex = Math.min(Math.max(startIndex, 0), maxIndex);
    const [currentIndex, setCurrentIndex] = useState(safeIndex);
    const [zoom, setZoom] = useState(minZoom);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const panStartRef = useRef({ x: 0, y: 0 });
    const offsetStartRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const hasMovedRef = useRef(false);
    const ignoreClickRef = useRef(false);

    const clampOffset = useCallback(
        (nextOffset: { x: number; y: number }, nextZoom: number) => {
            if (nextZoom <= minZoom) {
                return { x: 0, y: 0 };
            }

            const container = containerRef.current;
            if (!container) {
                return nextOffset;
            }

            const rect = container.getBoundingClientRect();
            const maxOffsetX = Math.max(0, ((nextZoom - 1) * rect.width) / 2);
            const maxOffsetY = Math.max(0, ((nextZoom - 1) * rect.height) / 2);

            return {
                x: Math.min(Math.max(nextOffset.x, -maxOffsetX), maxOffsetX),
                y: Math.min(Math.max(nextOffset.y, -maxOffsetY), maxOffsetY),
            };
        },
        [minZoom],
    );

    const updateZoom = useCallback(
        (nextZoom: number) => {
            setZoom(nextZoom);
            setOffset((prev) => clampOffset(prev, nextZoom));

            if (nextZoom <= minZoom) {
                hasMovedRef.current = false;
                ignoreClickRef.current = false;
            }
        },
        [clampOffset, minZoom],
    );

    const resetView = useCallback(() => {
        updateZoom(minZoom);
    }, [minZoom, updateZoom]);

    if (!open || images.length === 0) return null;

    const zoomPercent = Math.round(zoom * 100);
    const canNavigate = images.length > 1;
    const resolvedIndex = Math.min(currentIndex, maxIndex);
    const currentImage = images[resolvedIndex] ?? images[0];

    const handlePrev = () => {
        if (!canNavigate) return;
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        resetView();
    };

    const handleNext = () => {
        if (!canNavigate) return;
        setCurrentIndex((prev) => (prev + 1) % images.length);
        resetView();
    };

    const handleZoomIn = () => {
        const nextZoom = Math.min(maxZoom, Number((zoom + step).toFixed(2)));
        updateZoom(nextZoom);
    };

    const handleZoomOut = () => {
        const nextZoom = Math.max(minZoom, Number((zoom - step).toFixed(2)));
        updateZoom(nextZoom);
    };

    const handleResetZoom = () => {
        resetView();
    };

    const handleImageClick = () => {
        if (ignoreClickRef.current) {
            ignoreClickRef.current = false;
            return;
        }

        const nextZoom = zoom === minZoom ? Math.min(clickZoom, maxZoom) : minZoom;
        updateZoom(nextZoom);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (zoom <= minZoom || event.button !== 0) return;

        event.preventDefault();
        isPanningRef.current = true;
        setIsPanning(true);
        hasMovedRef.current = false;
        panStartRef.current = { x: event.clientX, y: event.clientY };
        offsetStartRef.current = offset;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isPanningRef.current) return;

        event.preventDefault();
        const dx = event.clientX - panStartRef.current.x;
        const dy = event.clientY - panStartRef.current.y;

        if (!hasMovedRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
            hasMovedRef.current = true;
        }

        const nextOffset = {
            x: offsetStartRef.current.x + dx,
            y: offsetStartRef.current.y + dy,
        };

        setOffset(clampOffset(nextOffset, zoom));
    };

    const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isPanningRef.current) return;

        isPanningRef.current = false;
        setIsPanning(false);
        if (hasMovedRef.current) {
            ignoreClickRef.current = true;
            hasMovedRef.current = false;
        }
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/80" />
                <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:items-center sm:p-4">
                    <DialogPrimitive.Title className="sr-only">{t('feed.view_image')}</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        {t('feed.view_image_description')}
                    </DialogPrimitive.Description>
                    <div className="flex h-full w-full max-w-5xl flex-col gap-3 sm:h-auto sm:max-h-[90svh]">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white">
                            <div className="font-semibold uppercase tracking-wide">
                                {canNavigate
                                    ? `${resolvedIndex + 1} / ${images.length}`
                                    : t('feed.view_image')}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleZoomOut}
                                    disabled={zoom <= minZoom}
                                    className="text-white hover:bg-white/10"
                                    aria-label={t('common.zoom_out')}
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleZoomIn}
                                    disabled={zoom >= maxZoom}
                                    className="text-white hover:bg-white/10"
                                    aria-label={t('common.zoom_in')}
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetZoom}
                                    disabled={zoom === minZoom}
                                    className="h-8 px-2 text-xs font-semibold text-white hover:bg-white/10"
                                    aria-label={t('common.reset_zoom')}
                                >
                                    {zoomPercent}%
                                </Button>
                                <DialogClose asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-white hover:bg-white/10"
                                        aria-label={t('common.close')}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </DialogClose>
                            </div>
                        </div>

                        <div className="relative flex-1 min-h-0">
                            <div
                                ref={containerRef}
                                className="flex h-full w-full min-h-0 items-center justify-center overflow-hidden touch-none sm:min-h-[60vh]"
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerEnd}
                                onPointerCancel={handlePointerEnd}
                            >
                                <img
                                    src={currentImage}
                                    alt={t('feed.view_image')}
                                    className={cn(
                                        'h-auto max-h-full max-w-full select-none object-contain will-change-transform',
                                        isPanning ? 'transition-none' : 'transition-transform duration-200 ease-out',
                                        zoom === minZoom
                                            ? 'cursor-zoom-in'
                                            : isPanning
                                                ? 'cursor-grabbing'
                                                : 'cursor-grab',
                                    )}
                                    style={{
                                        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                                    }}
                                    onClick={handleImageClick}
                                    draggable={false}
                                />
                            </div>
                            {canNavigate && (
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={handlePrev}
                                        aria-label={t('common.previous')}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 text-white hover:bg-black/80"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleNext}
                                        aria-label={t('common.next')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 text-white hover:bg-black/80"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    submitting: boolean;
    error?: string;
}

function ShareDialog({
    open,
    onOpenChange,
    value,
    onChange,
    onSubmit,
    submitting,
    error,
}: ShareDialogProps) {
    const { t } = useI18n();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>{t('feed.share_dialog_title')}</DialogTitle>
                        <DialogDescription>{t('feed.share_dialog_description')}</DialogDescription>
                    </DialogHeader>

                    <textarea
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        placeholder={t('feed.share_dialog_placeholder')}
                        className="min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/60"
                    />
                    <InputError message={error} />

                    <DialogFooter className="flex flex-row gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? t('common.loading') : t('feed.share_dialog_action')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SharedPostPreview({
    post,
    getInitials,
    onImageClick,
}: {
    post: FeedPost;
    getInitials: (value?: string | null) => string;
    onImageClick: (images: string[], index: number) => void;
}) {
    const [hiddenImages, setHiddenImages] = useState<string[]>([]);
    const sanitizedImages = useMemo(
        () => sanitizeImageUrls(post.image_urls).filter((url) => !hiddenImages.includes(url)),
        [post.image_urls, hiddenImages],
    );
    const imageGridClass = resolveImageGridClass(sanitizedImages.length);
    const timestamp = useMemo(() => formatRelativeTime(post.created_at), [post.created_at]);

    return (
        <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={post.user.avatar ?? undefined} alt={post.user.name} />
                    <AvatarFallback className="bg-muted text-foreground">
                        {getInitials(post.user.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                    <div className="text-sm font-semibold leading-tight text-foreground">
                        {post.user.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{timestamp}</div>
                </div>
            </div>

            {(post.content ?? '').split('\n').map((line, idx) => (
                <p key={`shared-preview-${idx}`}>{renderLineWithLinks(line, idx)}</p>
            ))}

            {sanitizedImages.length > 0 && (
                <div className={`grid w-full gap-2 ${imageGridClass}`}>
                {sanitizedImages.map((url, index) => (
                    <button
                        key={url}
                        type="button"
                        onClick={() => onImageClick(sanitizedImages, index)}
                        className="group overflow-hidden rounded-2xl border border-border transition hover:ring-0 focus-visible:outline-none focus-visible:ring-0"
                    >
                            <img
                                src={url}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={() => {
                                    setHiddenImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
                                }}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ActionButton({
    icon: Icon,
    label,
    className = '',
    onClick,
    active = false,
    disabled = false,
}: {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    className?: string;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            disabled={disabled}
            className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-none border-0 bg-transparent px-3 py-3 text-xs uppercase tracking-wide transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active ? 'text-primary font-bold' : 'text-muted-foreground font-semibold',
                disabled && 'cursor-not-allowed opacity-60',
                className,
            )}
        >
            <Icon className="h-4 w-4" strokeWidth={1.75} fill={active ? 'currentColor' : 'none'} />
            <span>{label}</span>
        </button>
    );
}

interface NotificationFloatingButtonProps {
    notifications: AppNotification[];
    unreadCount: number;
    onMarkAllRead?: () => void;
}

function NotificationFloatingButton({
    notifications,
    unreadCount,
    onMarkAllRead,
}: NotificationFloatingButtonProps) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const hasNotifications = notifications.length > 0;
    const badgeCount = Math.max(0, unreadCount);

    const handleMarkAllRead = () => {
        onMarkAllRead?.();
    };

    const resolveExcerpt = (notification: AppNotification) => {
        return (
            notification.data.reply_excerpt ||
            notification.data.comment_excerpt ||
            notification.data.post_excerpt ||
            notification.data.parent_excerpt ||
            ''
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                type="button"
                variant="default"
                size="icon"
                className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-xl lg:bottom-8 lg:right-8"
                onClick={() => setOpen(true)}
                aria-label={t('feed.notifications')}
            >
                <Bell className="h-5 w-5" />
                {badgeCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-black leading-none text-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                )}
            </Button>

            <DialogContent className="max-w-md p-0">
                <DialogHeader className="px-4 py-3">
                    <DialogTitle className="text-lg font-semibold">{t('feed.notifications')}</DialogTitle>
                    <DialogDescription>{t('feed.notifications_description')}</DialogDescription>
                </DialogHeader>

                <div className="max-h-[420px] divide-y divide-border/60 overflow-y-auto px-4">
                    {hasNotifications ? (
                        notifications.map((notification) => {
                            const excerpt = resolveExcerpt(notification);
                            return (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        'py-3 text-sm',
                                        !notification.read_at && 'bg-muted/30',
                                    )}
                                >
                                    <p className="font-medium leading-snug text-foreground">
                                        {notification.message}
                                    </p>
                                    {excerpt && (
                                        <p className="mt-1 text-xs text-muted-foreground">“{excerpt}”</p>
                                    )}
                                    {notification.created_at && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatRelativeTime(notification.created_at)}
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {t('feed.no_notifications')}
                        </p>
                    )}
                </div>

                <DialogFooter className="flex items-center justify-between px-4 py-3">
                    <DialogClose asChild>
                        <Button variant="ghost">{t('common.close')}</Button>
                    </DialogClose>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={!unreadCount || !onMarkAllRead}
                    >
                        {t('feed.mark_all_read')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ScrollToTopButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <Button
            type="button"
            size="icon"
            variant="secondary"
            className="fixed bottom-6 right-24 z-30 h-12 w-12 rounded-full shadow-lg hover:opacity-90 lg:bottom-8 lg:right-28"
            onClick={onClick}
            aria-label={label}
        >
            <ArrowUp className="h-5 w-5" />
        </Button>
    );
}


function formatCount(value?: number): string {
    const amount = Math.max(0, Math.floor(value ?? 0));
    if (amount < 1000) return amount.toString();

    const thousands = amount / 1000;
    const formatted = (Math.round(thousands * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
}

function formatRelativeTime(value: string): string {
    const date = new Date(value);
    const now = new Date();
    const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
}

const URL_REGEX = /\bhttps?:\/\/[^\s]+/gi;

function renderLineWithLinks(line: string, index: number): React.ReactNode[] | React.ReactNode {
    URL_REGEX.lastIndex = 0;

    const fragments: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = URL_REGEX.exec(line))) {
        const url = match[0];
        const start = match.index;

        if (start > lastIndex) fragments.push(line.slice(lastIndex, start));

        fragments.push(
            <a
                key={`link-${index}-${start}`}
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

