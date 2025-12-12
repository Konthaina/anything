import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from './contexts/language-context';
import { initializeTheme } from './hooks/use-appearance';

const appNameFromMeta =
    (typeof document !== 'undefined'
        ? document
              .querySelector('meta[name="app-name"]')
              ?.getAttribute('content')
        : null) || import.meta.env.VITE_APP_NAME;

let dynamicAppName = appNameFromMeta || 'Laravel';

type AppNameProps = {
    props?: {
        app?: { name?: string };
        name?: string;
    };
};

function extractAppName(source?: AppNameProps) {
    return source?.props?.app?.name ?? source?.props?.name;
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${dynamicAppName}` : dynamicAppName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const incomingAppName = extractAppName(props.initialPage as AppNameProps);
        if (incomingAppName) {
            dynamicAppName = incomingAppName;
        }

        router.on('navigate', (event: { detail: { page: AppNameProps } }) => {
            const nextName = extractAppName(event.detail.page);
            if (nextName) {
                dynamicAppName = nextName;
            }
        });

        const root = createRoot(el);

        root.render(
            <StrictMode>
                <I18nProvider>
                    <App {...props} />
                </I18nProvider>
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
