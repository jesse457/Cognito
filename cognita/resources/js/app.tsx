import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from './layouts/AppLayout';

const appName = import.meta.env.VITE_APP_NAME || 'Cognita';

/** Pages that render without the console chrome. */
const standalonePages = ['Auth/SignIn', 'Home', 'LiveCall/Room'];

const withLayout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
const withoutLayout = (page: React.ReactNode) => page;

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
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
        // the sidebar/header tree on every navigation.
        page.default.layout = standalonePages.includes(name) ? withoutLayout : withLayout;

        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#0f766e',
    },
});
