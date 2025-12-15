import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { type BreadcrumbItem, type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/language-context';
import { Form, Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Globe2,
    Heart,
    Image as ImageIcon,
    MessageSquare,
    MoreHorizontal,
    Share2,
    Edit3,
    Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

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
}


function safeId() {
    return (
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' && crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
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
            }));
    }, [posts]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('feed.title')} />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 pb-10">
                {auth?.user && <CreatePostCard currentUser={auth.user as FeedUser} getInitials={getInitials} />}

                <div className="space-y-4">
                    {normalizedPosts.map((post) => {
                        const imageSignature = (post.image_urls ?? []).join('|');
                        return (
                            <PostCard
                                key={`${post.id}-${imageSignature}`}
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
                <CardTitle className="text-base font-semibold leading-tight">{t('feed.create_title')}</CardTitle>
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
                        if (files.length === 0) {
                            return;
                        }
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
                                <Button
                                    type="submit"
                                    disabled={processing}
                                >
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
    const [liked, setLiked] = useState<boolean>(Boolean(post.liked));
    const [likesCount, setLikesCount] = useState<number>(post.likes_count ?? 0);
    const [likeProcessing, setLikeProcessing] = useState(false);
    const [hiddenImages, setHiddenImages] = useState<string[]>([]);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
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

    useEffect(() => {
        setLiked(Boolean(post.liked));
        setLikesCount(post.likes_count ?? 0);
    }, [post.id, post.liked, post.likes_count]);

    const handleLikeToggle = () => {
        if (likeProcessing) return;

        const previousLiked = liked;
        const previousCount = likesCount;
        const nextLiked = !previousLiked;

        setLikeProcessing(true);
        setLiked(nextLiked);
        setLikesCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

        router.post(`/feed/${post.id}/like`, {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedPosts = (page.props as { posts?: FeedPost[] } | undefined)?.posts;
                const updatedPost = updatedPosts?.find((item) => item.id === post.id);

                if (updatedPost) {
                    setLiked(Boolean(updatedPost.liked));
                    setLikesCount(Math.max(0, updatedPost.likes_count ?? 0));
                }
            },
            onError: () => {
                setLiked(previousLiked);
                setLikesCount(previousCount);
            },
            onFinish: () => setLikeProcessing(false),
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
                        <span className="text-foreground font-semibold">
                            {formatCount(likesCount)} {t('feed.like')}
                        </span>
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <span>
                                {formatCount(post.comments_count)} {t('feed.comments')}
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
                    <ActionButton icon={MessageSquare} label={t('feed.comment')} />
                    <ActionButton icon={Share2} label={t('feed.share')} />
                </div>
            </CardFooter>
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
                    if (!open) {
                        setLightboxImage(null);
                    }
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
    const [previewBlobUrls, setPreviewBlobUrls] = useState<string[]>([]);
    const [hiddenPreviewUrls, setHiddenPreviewUrls] = useState<string[]>([]);

    useEffect(() => {
        setData({
            content: post.content ?? '',
            images: [],
            remove_image: false,
        });
        clearErrors();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        previewBlobRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewBlobRef.current = [];
    }, [post.id, post.content, post.image_urls, open, setData, clearErrors]);

    useEffect(() => {
        return () => {
            previewBlobRef.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []).slice(0, MAX_IMAGES);
        setData('images', files);
        setData('remove_image', false);
        previewBlobRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewBlobRef.current = [];
        setHiddenPreviewUrls([]);
        setPreviewBlobUrls([]);
        if (files.length === 0) {
            return;
        }
        const urls = files.map((file) => URL.createObjectURL(file));
        previewBlobRef.current = urls;
        setPreviewBlobUrls(urls);
    };

    const handleRemoveImage = () => {
        const next = !form.data.remove_image;
        setData('remove_image', next);
        setPreviewBlobUrls([]);
        if (next) {
            setData('images', []);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            previewBlobRef.current.forEach((url) => URL.revokeObjectURL(url));
            previewBlobRef.current = [];
            setHiddenPreviewUrls([]);
        } else {
            setHiddenPreviewUrls([]);
        }
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
        : previewBlobUrls.length > 0
            ? previewBlobUrls
            : post.image_urls ?? [];
    const visiblePreviewUrls = previewSources.filter((url) => !hiddenPreviewUrls.includes(url));

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
                                            setHiddenPreviewUrls((prev) =>
                                                prev.includes(url) ? prev : [...prev, url],
                                            );
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

interface ImageViewerDialogProps {
    imageUrl: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function ImageViewerDialog({ imageUrl, open, onOpenChange }: ImageViewerDialogProps) {
    const { t } = useI18n();

    if (!imageUrl) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/80" />
                <DialogPrimitive.Content
                    className="fixed inset-x-4 top-[50%] z-50 max-h-[90vh] w-auto translate-y-[-50%] transform rounded-3xl bg-transparent p-0 shadow-none"
                >
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
                disabled && 'opacity-60 cursor-not-allowed',
                className,
            )}
        >
            <Icon
                className="h-4 w-4"
                strokeWidth={1.75}
                fill={active ? 'currentColor' : 'none'}
            />
            <span>{label}</span>
        </button>
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
    const fragments: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = URL_REGEX.exec(line))) {
        const url = match[0];
        const start = match.index;
        if (start > lastIndex) {
            fragments.push(line.slice(lastIndex, start));
        }
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

    if (lastIndex < line.length) {
        fragments.push(line.slice(lastIndex));
    }

    return fragments.length === 0 ? line : fragments;
}
