import { Link, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import adminRoutes from '@/routes/panel/admin';
import instructorRoutes from '@/lib/instructorRoutes';
import { logout as logoutRoute } from '@/routes';
import { cn } from '@/lib/utils';
import type { AuthUser, SharedProps } from '@/types';

interface NavItem {
    label: string;
    href: string;
    match: string;
}

function navFor(panel: 'admin' | 'instructor' | null, user: AuthUser | null): NavItem[] {
    if (panel === 'instructor') {
        return [
            { label: 'Overview', href: instructorRoutes.dashboard.url(), match: '/instructor' },
            { label: 'Classes', href: instructorRoutes.classes.index.url(), match: '/instructor/classes' },
        ];
    }

    // Each surface is gated by the same policy the server enforces, so the nav
    // never links a moderator into a 403.
    const rank = user?.role_rank ?? 0;

    const items: NavItem[] = [
        { label: 'Overview', href: adminRoutes.dashboard.url(), match: '/admin' },
        { label: 'Users', href: adminRoutes.users.index.url(), match: '/admin/users' },
        { label: 'Reports', href: adminRoutes.reports.index.url(), match: '/admin/reports' },
    ];

    if (rank >= 3) {
        items.push({ label: 'Courses', href: adminRoutes.courses.index.url(), match: '/admin/courses' });
        items.push({ label: 'Audit log', href: adminRoutes.audit.index.url(), match: '/admin/audit' });
    }

    if (rank >= 3) {
        items.push({ label: 'Staff invitations', href: adminRoutes.invitations.index.url(), match: '/admin/invitations' });
    }

    if (rank >= 4) {
        items.push({ label: 'System settings', href: adminRoutes.settings.index.url(), match: '/admin/settings' });
    }

    return items;
}

function SidebarLink({ item, current }: { item: NavItem; current: string }) {
    const active = current === item.match || current.startsWith(`${item.match}/`);

    return (
        <Link
            href={item.href}
            className={cn('nav-link mt-0.5', active && 'nav-link-active')}
            aria-current={active ? 'page' : undefined}
        >
            {item.label}
        </Link>
    );
}

export default function AppLayout({ children }: { children: ReactNode }) {
    const page = usePage<SharedProps>();
    const { auth, features, panel, appName } = page.props;
    const user = auth?.user ?? null;
    const current = page.url.split('?')[0] ?? '/';

    const items = navFor(panel, user);
    const surfaceLabel = panel === 'instructor' ? 'Instructor portal' : 'Admin panel';

    return (
        <div className="app-shell">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
            >
                Skip to content
            </a>

            <div className="flex min-h-[100dvh]">
                <aside className="sidebar" aria-label="Primary">
                    <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-sm font-semibold text-white">
                            C
                        </span>
                        <div className="leading-tight">
                            <p className="text-sm font-semibold tracking-tight text-zinc-900">{appName}</p>
                            <p className="text-[11px] text-zinc-500">{surfaceLabel}</p>
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-3 pb-4">
                        <p className="nav-group-label">Operate</p>
                        {items.map((item) => (
                            <SidebarLink key={item.label} item={item} current={current} />
                        ))}

                        <p className="nav-group-label">Environment</p>
                        <dl className="space-y-1 px-3 text-xs text-zinc-500">
                            <div className="flex items-center justify-between gap-2">
                                <dt>Instructor portal</dt>
                                <dd>
                                    <span className={cn('badge', features?.instructorPath ? 'badge-success' : 'badge-neutral')}>
                                        {features?.instructorPath ? 'enabled' : 'off'}
                                    </span>
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt>Community</dt>
                                <dd>
                                    <span className={cn('badge', features?.social ? 'badge-success' : 'badge-neutral')}>
                                        {features?.social ? 'enabled' : 'off'}
                                    </span>
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt>Live calls</dt>
                                <dd>
                                    <span className={cn('badge', features?.liveCalls ? 'badge-success' : 'badge-neutral')}>
                                        {features?.liveCalls ? 'enabled' : 'off'}
                                    </span>
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt>KT engine</dt>
                                <dd>
                                    <span className="badge badge-neutral">{features?.ktEngine ?? 'BKT'}</span>
                                </dd>
                            </div>
                        </dl>
                    </nav>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="topbar">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="badge badge-accent">{surfaceLabel}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {user?.is_instructor && features?.instructorPath ? (
                                <Link href={instructorRoutes.dashboard.url()} className="btn btn-ghost btn-sm">
                                    Instructor portal
                                </Link>
                            ) : null}
                            {user?.is_staff && panel === 'instructor' ? (
                                <Link href={adminRoutes.dashboard.url()} className="btn btn-ghost btn-sm">
                                    Admin panel
                                </Link>
                            ) : null}

                            <div className="flex items-center gap-2 border-l border-zinc-200 pl-3">
                                <span className="avatar" aria-hidden="true">
                                    {user?.initials}
                                </span>
                                <div className="hidden leading-tight sm:block">
                                    <p className="text-sm font-medium text-zinc-900">{user?.display_label}</p>
                                    <p className="text-[11px] text-zinc-500">{user?.role_label}</p>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => router.post(logoutRoute.url())}
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </header>

                    <main id="main" className="flex-1 px-5 py-6 lg:px-8">
                        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">{children}</div>
                    </main>

                    <footer className="border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500 lg:px-8">
                        Cognita staff console. Every privileged action is written to the audit trail.
                    </footer>
                </div>
            </div>
        </div>
    );
}
