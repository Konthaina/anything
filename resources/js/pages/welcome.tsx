import AppearanceDropdown from '@/components/appearance-dropdown';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/contexts/language-context';
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Code2,
    Globe,
    Lock,
    Moon,
    Radio,
    Rocket,
    Zap,
} from 'lucide-react';

export default function Welcome({ canRegister = true }: { canRegister?: boolean }) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const { t } = useI18n();
    const appData = page.props.app;

    const technologies = [
        {
            name: 'Laravel',
            src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-original.svg',
        },
        {
            name: 'React',
            src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
        },
        {
            name: 'TypeScript',
            src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
        },
        {
            name: 'Tailwind CSS',
            src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg',
        },
        {
            name: 'PHP',
            src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
        },
    ];

    const features = [
        {
            title: t('welcome.feature_auth_title'),
            desc: t('welcome.feature_auth_desc'),
            icon: <Lock className="h-6 w-6 text-emerald-500" />,
        },
        {
            title: t('welcome.feature_ui_title'),
            desc: t('welcome.feature_ui_desc'),
            icon: <Moon className="h-6 w-6 text-violet-500" />,
        },
        {
            title: t('welcome.feature_i18n_title'),
            desc: t('welcome.feature_i18n_desc'),
            icon: <Globe className="h-6 w-6 text-blue-500" />,
        },
        {
            title: t('welcome.feature_dx_title'),
            desc: t('welcome.feature_dx_desc'),
            icon: <Zap className="h-6 w-6 text-amber-500" />,
        },
        {
            title: t('welcome.feature_realtime_title'),
            desc: t('welcome.feature_realtime_desc'),
            icon: <Radio className="h-6 w-6 text-rose-500" />,
        },
        {
            title: t('welcome.feature_deployment_title'),
            desc: t('welcome.feature_deployment_desc'),
            icon: <Rocket className="h-6 w-6 text-cyan-500" />,
        },
    ];

    return (
        <>
            <Head title={t('welcome.title')} />
            <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-muted/40 text-foreground dark:from-[#111111] dark:via-[#0f0f0f] dark:to-[#0b0b0b]">
                {/* Navbar */}
                <nav className="sticky top-0 z-50 bg-transparent backdrop-blur-md">
                    <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
                        <div className="flex items-center gap-3">
                            {appData?.logo ? (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                                    <img
                                        src={`${appData.logo}${appData.updated_at ? `?v=${encodeURIComponent(appData.updated_at)}` : ''}`}
                                        alt="Logo"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                                    <Code2 className="h-5 w-5 text-primary-foreground" />
                                </div>
                            )}
                            <span className="text-sm font-bold">
                                {appData?.name || 'Anything'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="hidden items-center gap-2 md:flex">
                                <LanguageSwitcher size="sm" />
                                <AppearanceDropdown />
                            </div>
                            {auth.user ? (
                                <Link href={dashboard()}>
                                    <Button size="sm">
                                        <Zap className="mr-1.5 h-4 w-4" />
                                        {t('welcome.cta_dashboard')}
                                    </Button>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link href={login()}>
                                        <Button variant="ghost" size="sm">
                                            {t('welcome.cta_login')}
                                        </Button>
                                    </Link>
                                    {canRegister && (
                                        <Link href={register()}>
                                            <Button size="sm">{t('welcome.cta_register')}</Button>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                <main className="flex-1">
                    {/* Hero Section */}
                    <section className="relative overflow-hidden bg-transparent py-20 lg:py-32">
                        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                        <div className="container mx-auto px-4 text-center lg:px-8">
                            <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5">
                                <Code2 className="mr-1.5 h-3.5 w-3.5" />
                                Laravel 12 + React 19 + TypeScript
                            </Badge>
                            <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl">
                                {t('welcome.hero_title')}{' '}
                                <span className="bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent dark:from-orange-400 dark:via-pink-400 dark:to-purple-400">
                                    {t('welcome.hero_highlight')}
                                </span>
                            </h1>
                            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                                {t('welcome.hero_subtitle')}
                            </p>
                            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                                {auth.user ? (
                                    <Link href={dashboard()}>
                                        <Button size="lg" className="h-12 min-w-[180px]">
                                            <Zap className="mr-2 h-4 w-4" />
                                            {t('welcome.cta_dashboard')}
                                        </Button>
                                    </Link>
                                ) : (
                                    <>
                                        {canRegister && (
                                            <Link href={register()}>
                                                <Button size="lg" className="h-12 min-w-[180px]">
                                                    <Rocket className="mr-2 h-4 w-4" />
                                                    {t('welcome.cta_register')}
                                                </Button>
                                            </Link>
                                        )}
                                        <a href="https://github.com/Konthaina/anything" target="_blank" rel="noreferrer">
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="h-12 min-w-[180px]"
                                            >
                                                <Code2 className="mr-2 h-4 w-4" />
                                                {t('welcome.cta_github')}
                                            </Button>
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Tech Stack */}
                    <section className="relative overflow-hidden bg-transparent py-16">
                        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                        <div className="container mx-auto px-4 lg:px-8">
                            <p className="mb-10 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                {t('welcome.tech_stack_title')}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
                                {technologies.map((tech) => (
                                    <div
                                        key={tech.name}
                                        className="group flex flex-col items-center gap-2 transition-transform duration-300 hover:scale-110"
                                    >
                                        <img
                                            src={tech.src}
                                            alt={tech.name}
                                            className="h-12 w-12 object-contain transition-all duration-300 group-hover:drop-shadow-lg sm:h-14 sm:w-14"
                                        />
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {tech.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Features Grid */}
                    <section className="py-20 lg:py-32">
                        <div className="container mx-auto px-4 lg:px-8">
                            <div className="mb-16 text-center">
                                <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">
                                    {t('welcome.features_title')}
                                </h2>
                                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                                    {t('welcome.features_subtitle')}
                                </p>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {features.map((feature, index) => (
                                    <Card
                                        key={index}
                                        className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                                    >
                                        <CardHeader>
                                            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 transition-colors group-hover:bg-primary/10">
                                                {feature.icon}
                                            </div>
                                            <CardTitle className="text-xl">{feature.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <CardDescription className="text-base leading-relaxed">
                                                {feature.desc}
                                            </CardDescription>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>

                </main>

                <footer className="bg-transparent py-8">
                    <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row lg:px-8">
                        <div className="flex items-center gap-2">
                            {appData?.logo ? (
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded">
                                    <img
                                        src={`${appData.logo}${appData.updated_at ? `?v=${encodeURIComponent(appData.updated_at)}` : ''}`}
                                        alt="Logo"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                            ) : (
                                <Code2 className="h-5 w-5" />
                            )}
                            <span>
                                &copy; {new Date().getFullYear()}{' '}
                                {appData?.name || 'Anything Starter'}. Built with Laravel & React.
                            </span>
                        </div>
                        <div className="flex gap-6">
                            <a
                                href="https://github.com/Konthaina/anything"
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-foreground"
                            >
                                GitHub
                            </a>
                            <a
                                href="https://github.com/Konthaina/anything/blob/main/README.md"
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-foreground"
                            >
                                Documentation
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
