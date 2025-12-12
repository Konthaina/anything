import en from '@/locales/en.json';
import km from '@/locales/km.json';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';

export type Locale = 'en' | 'km';

type TranslationValue =
    | string
    | TranslationValue[]
    | Record<string, TranslationValue>;

type TranslationMap = Record<string, TranslationValue>;

interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
    tList: (key: string) => string[];
}

const STORAGE_KEY = 'app_locale';

const translations: Record<Locale, TranslationMap> = {
    en,
    km,
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function isLocale(value: unknown): value is Locale {
    return value === 'en' || value === 'km';
}

function getNestedTranslation(
    map: TranslationMap,
    key: string,
): TranslationValue | undefined {
    return key
        .split('.')
        .reduce<TranslationValue | undefined>((acc, part) => {
            if (
                acc &&
                typeof acc === 'object' &&
                acc !== null &&
                part in acc
            ) {
                return acc[part];
            }
            return undefined;
        }, map);
}

function formatTemplate(
    value: string,
    replacements?: Record<string, string | number>,
): string {
    if (!replacements) return value;

    return Object.entries(replacements).reduce((text, [key, replacement]) => {
        return text.replaceAll(`{${key}}`, String(replacement));
    }, value);
}

function detectInitialLocale(): Locale {
    if (typeof window === 'undefined') return 'en';

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;

    const browserLocale = navigator.language?.toLowerCase();
    if (browserLocale.startsWith('km')) return 'km';

    return 'en';
}

export function I18nProvider({ children }: PropsWithChildren) {
    const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, next);
            document.documentElement.lang = next;
        }
    }, []);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = locale;
        }
    }, [locale]);

    const translateValue = useCallback(
        (key: string): TranslationValue | undefined => {
            return (
                getNestedTranslation(translations[locale], key) ??
                getNestedTranslation(translations.en, key)
            );
        },
        [locale],
    );

    const t = useCallback(
        (key: string, replacements?: Record<string, string | number>) => {
            const translation = translateValue(key);

            if (!translation || typeof translation !== 'string') {
                return key;
            }

            return formatTemplate(translation, replacements);
        },
        [translateValue],
    );

    const tList = useCallback(
        (key: string) => {
            const translation = translateValue(key);
            if (Array.isArray(translation)) {
                return translation.map((item) => String(item));
            }
            if (typeof translation === 'string') {
                return [translation];
            }
            return [];
        },
        [translateValue],
    );

    const value = useMemo<I18nContextValue>(
        () => ({
            locale,
            setLocale,
            t,
            tList,
        }),
        [locale, setLocale, t, tList],
    );

    return (
        <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}
