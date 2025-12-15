import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher?: typeof Pusher;
        EchoInstance?: Echo;
    }
}

let echo: Echo | null = null;

const normalizePath = (value?: string | null): string | undefined => {
    if (!value) return undefined;
    return value.startsWith('/') ? value : `/${value}`;
};

export function getEchoInstance(): Echo | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (echo) {
        return echo;
    }

    const key = import.meta.env.VITE_REVERB_APP_KEY;
    if (!key) {
        if (import.meta.env.DEV) {
            console.warn('[feed] realtime disabled - missing VITE_REVERB_APP_KEY');
        }
        return null;
    }

    const scheme =
        (import.meta.env.VITE_REVERB_SCHEME as string | undefined) ||
        window.location.protocol.replace(':', '');
    const host = (import.meta.env.VITE_REVERB_HOST as string | undefined) || window.location.hostname;
    const port =
        Number(import.meta.env.VITE_REVERB_PORT) || (scheme === 'https' ? 443 : window.location.port || 80);
    const path = normalizePath(import.meta.env.VITE_REVERB_PATH as string | undefined);
    const cluster = (import.meta.env.VITE_REVERB_CLUSTER as string | undefined) || 'mt1';

    window.Pusher = Pusher;

    echo = new Echo({
        broadcaster: 'pusher',
        key,
        wsHost: host,
        httpHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        encrypted: scheme === 'https',
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
        cluster,
        ...(path ? { wsPath: path } : {}),
    });

    window.EchoInstance = echo;

    return echo;
}
