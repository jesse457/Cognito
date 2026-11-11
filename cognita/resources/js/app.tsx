import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/hooks/useTheme';
import AppShell from '@/layouts/AppShell';
import CommunityShell from '@/layouts/CommunityShell';
import DashboardShell from '@/layouts/DashboardShell';
import GuestShell from '@/layouts/GuestShell';

const appName = import.meta.env.VITE_APP_NAME || 'Cognita';

/** Pages that bring their own chrome. */
const barePages = ['LiveCall/Room'];

/** Guest pages share the split brand/auth layout. */
const guestPages = ['Welcome', 'Auth/SignIn', 'Auth/Register'];

/** Instructor and student surfaces use the dashboard chrome with a sidebar. */
const withDashboard = (page: React.ReactNode) => <DashboardShell>{page}</DashboardShell>;

/** The community board is a top-bar forum, not another dashboard section. */
const withCommunity = (page: React.ReactNode) => <CommunityShell>{page}</CommunityShell>;

const shellFor = (name: string) => {
    if (barePages.includes(name)) {
        return (page: React.ReactNode) => page;
    }

    if (guestPages.includes(name)) {
        return (page: React.ReactNode) => <GuestShell>{page}</GuestShell>;
    }

    if (name.startsWith('Instructor/') || name.startsWith('Student/')) {
        return withDashboard;
    }

    if (name.startsWith('Questions/')) {
        return withCommunity;
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
        // Theme and toasts sit above the page shell so any page can use them.
        createRoot(el).render(
            <ThemeProvider>
                <ToastProvider>
                    <App {...props} />
                </ToastProvider>
            </ThemeProvider>,
        );
    },
    progress: {
        color: '#1e5b48',
    },
});
