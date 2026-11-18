import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/hooks/useTheme';
import { shellFor } from '@/layouts/shell';

const appName = import.meta.env.VITE_APP_NAME || 'Cognita';

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
        color: '#1f4ae0',
    },
});
