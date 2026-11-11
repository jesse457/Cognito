import { Link, router, usePage } from '@inertiajs/react';
import { SignOut } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import Flash from '@/components/ui/Flash';
import Avatar from '@/components/ui/Avatar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { AuthUser, SharedProps } from '@/types';

interface NavItem {
    label: string;
    href: string;
    matches: (path: string) => boolean;
}

function navFor(user: AuthUser): NavItem[] {
    const exact = (href: string) => (path: string) => path === href;
    const section = (href: string) => (path: string) => path === href || path.startsWith(`${href}/`);

    if (user.role === 'admin') {
        return [
            { label: 'Overview', href: routes.admin.dashboard, matches: exact(routes.admin.dashboard) },
            { label: 'People', href: routes.admin.users, matches: section(routes.admin.users) },
            { label: 'Courses', href: routes.admin.courses, matches: section(routes.admin.courses) },
            { label: 'Classes', href: routes.admin.classrooms, matches: section(routes.admin.classrooms) },
        ];
    }

    if (user.role === 'instructor') {
        return [
            { label: 'Overview', href: routes.instructor.dashboard, matches: exact(routes.instructor.dashboard) },
            { label: 'Courses', href: routes.instructor.courses, matches: section(routes.instructor.courses) },
        ];
    }

    return [{ label: 'My classes', href: routes.student.home, matches: section(routes.student.home) }];
}

export default function AppShell({ children }: { children: ReactNode }) {
    const page = usePage<SharedProps>();
    const { appName, auth } = page.props;
    const user = auth?.user ?? null;
    const path = page.url.split('?')[0] ?? '/';

    const items = user ? navFor(user) : [];

    return (
        <div className="flex min-h-[100dvh] flex-col bg-canvas">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-ink"
            >
                Skip to content
            </a>

            <header className="appbar">
                <Link href={routes.dashboard} className="flex items-center gap-2.5" aria-label={`${appName} home`}>
                    <span className="brand-mark" aria-hidden="true">
                        C
                    </span>
                    <span className="hidden text-[15px] font-semibold tracking-tight sm:block">{appName}</span>
                </Link>

                <nav className="nav-tabs ml-2 flex-1" aria-label="Primary">
                    {items.map((item) => {
                        const active = item.matches(path);

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn('nav-tab', active && 'nav-tab-active')}
                                aria-current={active ? 'page' : undefined}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {user ? (
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <div className="hidden items-center gap-2.5 border-l border-line pl-3 sm:flex">
                            <Avatar name={user.name} />
                            <div className="leading-tight">
                                <p className="max-w-[18ch] truncate text-[13px] font-medium text-ink">{user.name}</p>
                                <p className="text-[11px] text-ink-muted">{user.role_label}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() => router.post(routes.logout)}
                            title="Sign out"
                        >
                            <SignOut size={16} aria-hidden="true" />
                            <span className="hidden sm:inline">Sign out</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link href={routes.login} className="btn btn-primary btn-sm">
                            Sign in
                        </Link>
                    </div>
                )}
            </header>

            <main id="main" className="flex-1">
                <div className="page">
                    <div className="flex flex-col gap-6">
                        <Flash />
                        {children}
                    </div>
                </div>
            </main>

            <footer className="border-t border-line px-4 py-4 text-xs text-ink-muted sm:px-6">
                <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-2">
                    <span>
                        {appName} · courses, classes and live group calls
                    </span>
                    <span>One call per class. One shared board.</span>
                </div>
            </footer>
        </div>
    );
}
