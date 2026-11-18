import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Flash from '@/components/ui/Flash';
import ThemeToggle from '@/components/ui/ThemeToggle';
import {
    AccountMenu,
    BrandLink,
    exact,
    section,
    ShellFooter,
    SignInLink,
    SkipLink,
} from '@/layouts/chrome';
import type { NavEntry } from '@/layouts/chrome';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { AuthUser, SharedProps } from '@/types';

function navFor(user: AuthUser): NavEntry[] {
    if (user.role === 'admin') {
        return [
            ['Overview', routes.admin.dashboard, exact(routes.admin.dashboard)],
            ['People', routes.admin.users, section(routes.admin.users)],
            ['Courses', routes.admin.courses, section(routes.admin.courses)],
            ['Classes', routes.admin.classrooms, section(routes.admin.classrooms)],
        ];
    }

    if (user.role === 'instructor') {
        return [
            ['Overview', routes.instructor.dashboard, exact(routes.instructor.dashboard)],
            ['My courses', routes.instructor.courses, section(routes.instructor.courses)],
            ['Community', routes.questions.index, section(routes.questions.index)],
        ];
    }

    return [
        ['My classes', routes.student.home, section(routes.student.home)],
        ['Community', routes.questions.index, section(routes.questions.index)],
    ];
}

/**
 * The fallback chrome for the surfaces that do not have a dashboard of their
 * own: one slim bar, the navigation, and the account.
 */
export default function AppShell({ children }: { children: ReactNode }) {
    const page = usePage<SharedProps>();
    const { appName, auth } = page.props;
    const user = auth?.user ?? null;
    const path = page.url.split('?')[0] ?? '/';

    const items = user ? navFor(user) : [];

    return (
        <div className="flex min-h-[100dvh] flex-col bg-canvas">
            <SkipLink />

            <header className="appbar">
                <BrandLink appName={appName} />

                <nav className="nav-tabs ml-2 flex-1" aria-label="Primary">
                    {items.map(([label, href, matches]) => {
                        const active = matches(path);

                        return (
                            <Link
                                key={label}
                                href={href}
                                className={cn('nav-tab', active && 'nav-tab-active')}
                                aria-current={active ? 'page' : undefined}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                {user ? (
                    <AccountMenu user={user} />
                ) : (
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <SignInLink />
                    </div>
                )}
            </header>

            <main id="main" className="flex-1">
                <div className="page">
                    <div className="flex flex-col gap-6">
                        <Flash />
                        <ErrorBanner />
                        {children}
                    </div>
                </div>
            </main>

            <ShellFooter appName={appName} right="One call per class. One shared board." />
        </div>
    );
}
