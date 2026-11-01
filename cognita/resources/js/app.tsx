import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppShell from '@/layouts/AppShell';
import GuestShell from '@/layouts/GuestShell';

const appName = import.meta.env.VITE_APP_NAME || 'Cognita';

/** Pages that bring their own chrome. */
const barePages = ['LiveCall/Room'];

/** Guest pages share the split brand/auth layout. */
const guestPages = ['Welcome', 'Auth/SignIn', 'Auth/Register'];

const shellFor = (name: string) => {
    if (barePages.includes(name)) {
        return (page: React.ReactNode) => page;
    }

    if (guestPages.includes(name)) {
        return (page: React.ReactNode) => <GuestShell>{page}</GuestShell>;
    }

    return (page: React.ReactNode) => <AppShell>{page}</AppShell>;
};

createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    resolve: (name) => {
        const pages = import.meta.glob('./pages/**/*.tsx', { eager: true });
        const page = pages[`./pages/${name}.tsx`] as
            | {
                  default: React.ComponentType & {
                      layout?: (page: React.ReactNode) => React.ReactNode;
                  };
              }
            | undefined;

        if (!page) {
            throw new Error(`Page not found: ${name}`);
        }

        // Stable layout identity: a fresh arrow function per visit would remount
        // the shell on every navigation.
        page.default.layout = shellFor(name);

        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#0b57d0',
    },
});
