import { Button } from '@/components/ui/button';
import { useI18n, type Locale } from '@/contexts/language-context';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
    className?: string;
    size?: 'default' | 'sm';
}

export function LanguageSwitcher({
    className,
    size = 'default',
}: LanguageSwitcherProps) {
    const { locale, setLocale, t } = useI18n();

    // Use short codes visually to keep the pill compact; keep full labels for accessibility
    const options: { code: Locale; label: string; short: string }[] = [
        { code: 'en', label: t('language_switcher.en'), short: 'EN' },
        { code: 'km', label: t('language_switcher.km'), short: 'KH' },
    ];

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1 rounded-full bg-muted/60 p-1',
                className,
            )}
            role="group"
            aria-label={t('language_switcher.label')}
        >
            {options.map((option) => (
                <Button
                    key={option.code}
                    type="button"
                    variant={locale === option.code ? 'default' : 'ghost'}
                    size={size}
                    className={cn(
                        'px-3 font-semibold uppercase tracking-wide transition rounded-full',
                        size === 'sm' && 'h-8 px-2 text-xs',
                        size === 'default' && 'h-9',
                        locale === option.code
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground hover:bg-muted',
                    )}
                    onClick={() => setLocale(option.code)}
                    aria-label={t('language_switcher.switch_to', {
                        language: option.label,
                    })}
                >
                    {option.short}
                </Button>
            ))}
        </div>
    );
}
