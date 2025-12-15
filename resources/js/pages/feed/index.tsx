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
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Form, Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Edit3,
    Globe2,
    Heart,
    Image as ImageIcon,
    MessageSquare,
    MoreHorizontal,
    Share2,
    Trash2,
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

interface PostLikesUpdatedPayload {
    post_id: number | string;
    likes_count?: number;
}

interface PostCommentCreatedPayload {
    post_id: number | string;
    comments_count?: number;
    comment?: FeedComment;
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

const MAX_IMAGES = 7;

export default function FeedPage() {
    const { posts: pagePosts, auth } = usePage<SharedData & { posts?: FeedPost[] }>().props;
    const posts = useMemo(() => pagePosts ?? [], [pagePosts]);
    const authUserId = auth?.user?.id;
    const { t } = useI18n();

    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [{ title: t('feed.title'), href: '/feed' }],
        [t],
    );

    const getInitials = useInitials();

    const normalizedPosts = useMemo(() => {
        return posts
            .filter(Boolean)
            .map((post) => ({
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
                comments: (post?.comments ?? []).map((comment) => normalizeComment(comment)),
            }));
    }, [posts]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('feed.title')} />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 pb-10">
                {auth?.user && (
                    <CreatePostCard currentUser={auth.user as FeedUser} getInitials={getInitials} />
                )}

                <div className="space-y-4">
                    {normalizedPosts.map((post) => {
                        const imageSignature = (post.image_urls ?? []).join('|');
                        const commentsSignature = (post.comments ?? [])
                            .map((comment) => comment.id)
                            .join('|');
                        const postSignature = [
                            post.id,
                            post.likes_count ?? 0,
                            post.comments_count ?? 0,
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

                    {normalizedPosts.length === 0 && (
                        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
                            <CardContent className="py-10 text-center text-sm text-slate-400">
                                {t('feed.empty')}
                            </CardContent>
                        </Card>
                    )}
                </div>
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
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // ✅ optimistic like (no syncing effect)
    const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
    const [optimisticLikesCount, setOptimisticLikesCount] = useState<number | null>(null);
    const [liveLikesCount, setLiveLikesCount] = useState(post.likes_count ?? 0);
    const [liveCommentsCount, setLiveCommentsCount] = useState(post.comments_count ?? 0);
    const [liveComments, setLiveComments] = useState<FeedComment[]>(post.comments ?? []);

    const liked = optimisticLiked ?? Boolean(post.liked);
    const likesCount = optimisticLikesCount ?? liveLikesCount;

    const comments = liveComments;
    const commentsCount = liveCommentsCount;

    const isAuthor = authUserId !== undefined && authUserId === post.user.id;
    const timestamp = useMemo(() => formatRelativeTime(post.created_at), [post.created_at]);

    const sanitizedImageUrls = useMemo(() => {
        const urls = post.image_urls ?? [];
        return urls.filter((url) => url && !url.includes('via.placeholder.com'));
    }, [post.image_urls]);

    const visibleImageUrls = sanitizedImageUrls.filter((url) => !hiddenImages.includes(url));
    const imageGridClass =
        visibleImageUrls.length === 1
            ? 'grid-cols-1'
            : visibleImageUrls.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 sm:grid-cols-3';

    const idsMatch = useCallback((a?: number | string | null, b?: number | string | null) => {
        if (a === undefined || a === null || b === undefined || b === null) {
            return false;
        }
        return String(a) === String(b);
    }, []);

    const mergeIncomingComment = useCallback(
        (incoming?: FeedComment) => {
            if (!incoming) return;

            const normalized = normalizeComment(incoming);
            setLiveComments((current) => {
                if (normalized.parent_id !== undefined && normalized.parent_id !== null) {
                    return current.map((comment) => {
                        if (idsMatch(comment.id, normalized.parent_id)) {
                            const replies = comment.replies ?? [];
                            const alreadyExists = replies.some((reply) => idsMatch(reply.id, normalized.id));

                            return {
                                ...comment,
                                replies: alreadyExists ? replies : [normalized, ...replies],
                            };
                        }
                        return comment;
                    });
                }

                const exists = current.some((comment) => idsMatch(comment.id, normalized.id));

                if (exists) {
                    return current.map((comment) =>
                        idsMatch(comment.id, normalized.id) ? normalized : comment,
                    );
                }

                return [normalized, ...current];
            });
        },
        [idsMatch],
    );

    useEffect(() => {
        const echo = getEchoInstance();
        if (!echo) return;

        const channelName = `posts.${post.id}`;
        const channel = echo.channel(channelName);

        const handleLikes = (payload: PostLikesUpdatedPayload) => {
            if (!payload || !idsMatch(payload.post_id, post.id)) return;
            setLiveLikesCount(Math.max(0, payload.likes_count ?? 0));
            setOptimisticLikesCount(null);
        };

        const handleComments = (payload: PostCommentCreatedPayload) => {
            if (!payload || !idsMatch(payload.post_id, post.id)) return;
            setLiveCommentsCount(Math.max(0, payload.comments_count ?? 0));
            mergeIncomingComment(payload.comment);
        };

        channel.listen('.PostLikesUpdated', handleLikes);
        channel.listen('.PostCommentCreated', handleComments);

        return () => {
            channel.stopListening('.PostLikesUpdated');
            channel.stopListening('.PostCommentCreated');
            echo.leaveChannel(channelName);
        };
    }, [post.id, mergeIncomingComment, idsMatch]);

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
                    const updatedPosts = (page.props as { posts?: FeedPost[] } | undefined)?.posts;
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
                {(post.content ?? '').split('\n').map((line, idx) => (
                    <p key={idx}>{renderLineWithLinks(line, idx)}</p>
                ))}

                {visibleImageUrls.length > 0 && (
                    <div className={`grid w-full gap-2 ${imageGridClass}`}>
                        {visibleImageUrls.map((url) => (
                            <button
                                key={url}
                                type="button"
                                onClick={() => setLightboxImage(url)}
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
                                {formatCount(post.shares_count)} {t('feed.shares')}
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
                    <ActionButton icon={Share2} label={t('feed.share')} />
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

            <ImageViewerDialog
                imageUrl={lightboxImage}
                open={Boolean(lightboxImage)}
                onOpenChange={(open) => {
                    if (!open) setLightboxImage(null);
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

    // ✅ refs for previews (no setState in useEffect)
    const previewBlobRef = useRef<string[]>([]);
    const hiddenPreviewRef = useRef<Set<string>>(new Set());
    const [, rerender] = useState(0);
    const bump = () => rerender((v) => v + 1);

    const cleanupBlobUrls = () => {
        previewBlobRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewBlobRef.current = [];
    };

    // ✅ keep this effect only for cleaning external resources (blob urls) + resetting input
    // ✅ NO setState here
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

    const previewSources = form.data.remove_image
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

                    {visiblePreviewUrls.length > 0 && (
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

    // ✅ newest comment on top
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

    // ✅ newest reply on top
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

    // ✅ remove effect that sets data (avoids lint). Just initialize from prop.
    // If parentId changes (switch reply target), we can set it via memo key on CommentForm usage if needed.
    // For safety: set it only when submitting.
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
    imageUrl: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function ImageViewerDialog({ imageUrl, open, onOpenChange }: ImageViewerDialogProps) {
    const { t } = useI18n();

    if (!imageUrl) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/80" />
                <DialogPrimitive.Content className="fixed inset-x-4 top-[50%] z-50 max-h-[90vh] w-auto translate-y-[-50%] transform rounded-3xl bg-transparent p-0 shadow-none">
                    <DialogPrimitive.Title className="sr-only">{t('feed.view_image')}</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        {t('feed.view_image_description')}
                    </DialogPrimitive.Description>
                    <div className="flex items-center justify-center">
                        <img
                            src={imageUrl}
                            alt={t('feed.view_image')}
                            className="max-h-[90vh] w-full object-contain"
                        />
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
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
    // ✅ reset because /g regex keeps internal cursor between calls
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
