import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    Books,
    CalendarCheck,
    CaretLineLeft,
    CaretLineRight,
    ChalkboardTeacher,
    ChatsCircle,
    FilePdf,
    HouseLine,
    List,
    SignOut,
    SquaresFour,
    Student,
    X,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Avatar from '@/components/ui/Avatar';
import Flash from '@/components/ui/Flash';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { AuthUser, SharedProps } from '@/types';

const STORAGE_KEY = 'cognita.sidebar';

interface NavItem {
    label: string;
    href: string;
    icon: Icon;
    matches: (path: string) => boolean;
}

function navFor(user: AuthUser): NavItem[] {
    const exact = (href: string) => (path: string) => path === href;
    const section = (href: string) => (path: string) => path === href || path.startsWith(`${href}/`);

    if (user.role === 'instructor') {
        return [
            {
                label: 'Overview',
                href: routes.instructor.dashboard,
                icon: SquaresFour,
                matches: exact(routes.instructor.dashboard),
            },
            {
                label: 'Classes',
                href: routes.instructor.classrooms,
                icon: ChalkboardTeacher,
                matches: section(routes.instructor.classrooms),
            },
            {
                label: 'Students',
                href: routes.instructor.students,
                icon: Student,
                matches: section(routes.instructor.students),
            },
            {
                label: 'Attendance',
                href: routes.instructor.attendance,
                icon: CalendarCheck,
                matches: section(routes.instructor.attendance),
            },
            {
                label: 'Courses',
                href: routes.instructor.courses,
                icon: Books,
                matches: section(routes.instructor.courses),
            },
        ];
    }

    return [
        {
            label: 'Overview',
            href: routes.student.home,
            icon: HouseLine,
            matches: exact(routes.student.home),
        },
        {
            label: 'My classes',
            href: routes.student.classrooms,
            icon: ChalkboardTeacher,
            matches: section(routes.student.classrooms),
        },
        {
            label: 'Attendance',
            href: routes.student.attendance,
            icon: CalendarCheck,
            matches: section(routes.student.attendance),
        },
        {
            label: 'Materials',
            href: routes.student.materials,
            icon: FilePdf,
            matches: section(routes.student.materials),
        },
    ];
}

function SidebarNav({
    items,
    path,
    collapsed,
    onNavigate,
}: {
    items: NavItem[];
    path: string;
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    return (
        <nav className="flex flex-col gap-1" aria-label="Dashboard">
            {items.map((item) => {
                const active = item.matches(path);
                const Glyph = item.icon;

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            collapsed && 'justify-center px-0',
                            active
                                ? 'bg-brand-soft text-brand'
                                : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                        )}
                    >
                        <Glyph
                            size={20}
                            weight={active ? 'fill' : 'duotone'}
                            className="shrink-0"
                            aria-hidden="true"
                        />
                        <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

function CommunityLink({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
    return (
        <div className="mt-4 border-t border-line pt-4">
            {collapsed ? null : <p className="eyebrow px-2 pb-2">School board</p>}
            <Link
                href={routes.questions.index}
                onClick={onNavigate}
                title={collapsed ? 'Community Q&A' : undefined}
                className={cn(
                    'group flex items-center gap-3 rounded-xl border border-line/70 bg-surface-sunken/40 px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand/25 hover:bg-brand-soft/60',
                    collapsed && 'justify-center border-transparent bg-transparent px-0',
                )}
            >
                <ChatsCircle size={19} weight="duotone" className="shrink-0 text-brand" aria-hidden="true" />
                {collapsed ? (
                    <span className="sr-only">Community Q&amp;A</span>
                ) : (
                    <>
                        <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate">Community Q&amp;A</span>
                            <span className="block truncate text-[10.5px] font-normal text-ink-muted">
                                Ask the whole school
                            </span>
                        </span>
                        <ArrowUpRight
                            size={14}
                            className="shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            aria-hidden="true"
                        />
                    </>
                )}
            </Link>
        </div>
    );
}

function UserCard({ user, collapsed }: { user: AuthUser; collapsed: boolean }) {
    return (
        <div
            className={cn(
                'flex items-center gap-2.5 rounded-xl border border-line bg-surface-sunken/60 p-2',
                collapsed && 'justify-center border-transparent bg-transparent p-0',
            )}
            title={collapsed ? `${user.name} · ${user.role_label}` : undefined}
        >
            <Avatar name={user.name} />
            {collapsed ? null : (
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
                    <p className="text-[11px] text-ink-muted">{user.role_label}</p>
                </div>
            )}
        </div>
    );
}

/**
 * The instructor and student surfaces use one dashboard chrome: a collapsible
 * sidebar on desktop, a slide-in drawer on phones, and a slim top bar with the
 * current section and the signed-in account. The collapsed state is remembered
 * between visits so a small screen or a large monitor can keep its preference.
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
    const page = usePage<SharedProps>();
    const { appName, auth } = page.props;
    const user = auth?.user ?? null;
    const path = page.url.split('?')[0] ?? '/';

    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
    });
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
    }, [collapsed]);

    useEffect(() => {
        setMobileOpen(false);
    }, [page.url]);

    useEffect(() => {
        if (!mobileOpen) {
            return;
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setMobileOpen(false);
            }
        }

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [mobileOpen]);

    if (user === null) {
        return <>{children}</>;
    }

    const items = navFor(user);
    const current = items.find((item) => item.matches(path));

    return (
        <div className="flex min-h-[100dvh] bg-canvas">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-ink"
            >
                Skip to content
            </a>

            <aside
                className={cn(
                    'sticky top-0 hidden h-[100dvh] shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out lg:flex',
                    collapsed ? 'w-[78px]' : 'w-[264px]',
                )}
                aria-label="Sidebar"
            >
                <div className={cn('flex h-16 items-center gap-2.5 border-b border-line px-4', collapsed && 'justify-center px-0')}>
                    <Link href={routes.dashboard} className="flex items-center gap-2.5" aria-label={`${appName} home`}>
                        <span className="brand-mark shrink-0" aria-hidden="true">
                            C
                        </span>
                        {collapsed ? null : (
                            <span className={cn('text-[15px] font-semibold tracking-tight', collapsed && 'sr-only')}>
                                {appName}
                            </span>
                        )}
                    </Link>

                    {collapsed ? null : (
                        <button
                            type="button"
                            onClick={() => setCollapsed(true)}
                            className="btn btn-quiet btn-icon btn-sm ml-auto"
                            title="Collapse sidebar"
                            aria-label="Collapse sidebar"
                        >
                            <CaretLineLeft size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>

                {collapsed ? (
                    <div className="flex justify-center border-b border-line py-3">
                        <button
                            type="button"
                            onClick={() => setCollapsed(false)}
                            className="btn btn-quiet btn-icon btn-sm"
                            title="Expand sidebar"
                            aria-label="Expand sidebar"
                        >
                            <CaretLineRight size={16} aria-hidden="true" />
                        </button>
                    </div>
                ) : null}

                <div className="flex-1 overflow-y-auto px-3 py-4">
                    {collapsed ? null : <p className="eyebrow px-2 pb-2">{user.role_label}</p>}
                    <SidebarNav items={items} path={path} collapsed={collapsed} />
                    <CommunityLink collapsed={collapsed} />
                </div>

                <div className="border-t border-line p-3">
                    <UserCard user={user} collapsed={collapsed} />
                    <div className={cn('mt-2', collapsed && 'flex justify-center')}>
                        <ThemeToggle showLabel={!collapsed} />
                    </div>
                    {collapsed ? null : (
                        <button
                            type="button"
                            onClick={() => router.post(routes.logout)}
                            className="btn btn-quiet btn-sm mt-1 w-full justify-start"
                        >
                            <SignOut size={16} aria-hidden="true" />
                            Sign out
                        </button>
                    )}
                </div>
            </aside>

            {mobileOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                    />
                    <aside
                        className="panel-in relative flex h-full w-[286px] max-w-[86vw] flex-col border-r border-line bg-surface shadow-[0_24px_70px_rgba(25,28,32,0.28)]"
                        aria-label="Sidebar"
                    >
                        <div className="flex h-16 items-center gap-2.5 border-b border-line px-4">
                            <Link
                                href={routes.dashboard}
                                className="flex items-center gap-2.5"
                                aria-label={`${appName} home`}
                            >
                                <span className="brand-mark" aria-hidden="true">
                                    C
                                </span>
                                <span className="text-[15px] font-semibold tracking-tight">{appName}</span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => setMobileOpen(false)}
                                className="btn btn-quiet btn-icon btn-sm ml-auto"
                                aria-label="Close menu"
                            >
                                <X size={18} weight="bold" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-3 py-4">
                            <p className="eyebrow px-2 pb-2">{user.role_label}</p>
                            <SidebarNav
                                items={items}
                                path={path}
                                collapsed={false}
                                onNavigate={() => setMobileOpen(false)}
                            />
                            <CommunityLink collapsed={false} onNavigate={() => setMobileOpen(false)} />
                        </div>

                        <div className="border-t border-line p-3">
                            <UserCard user={user} collapsed={false} />
                            <div className="mt-2">
                                <ThemeToggle showLabel />
                            </div>
                            <button
                                type="button"
                                onClick={() => router.post(routes.logout)}
                                className="btn btn-quiet btn-sm mt-1 w-full justify-start"
                            >
                                <SignOut size={16} aria-hidden="true" />
                                Sign out
                            </button>
                        </div>
                    </aside>
                </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur-md sm:px-6">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        className="btn btn-quiet btn-icon btn-sm lg:hidden"
                        aria-label="Open menu"
                    >
                        <List size={20} aria-hidden="true" />
                    </button>

                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
                            {user.role_label}
                        </p>
                        <p className="truncate text-sm font-semibold text-ink">
                            {current?.label ?? 'Dashboard'}
                        </p>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
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
                            className="btn btn-quiet btn-icon btn-sm"
                            onClick={() => router.post(routes.logout)}
                            title="Sign out"
                            aria-label="Sign out"
                        >
                            <SignOut size={17} aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <main id="main" className="flex-1">
                    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
                        <div className="flex flex-col gap-6">
                            <Flash />
                            {children}
                        </div>
                    </div>
                </main>

                <footer className="border-t border-line px-4 py-3 text-[11px] text-ink-muted sm:px-6">
                    <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-2">
                        <span>{appName} · courses, classes and live group calls</span>
                        <span>{user.role === 'instructor' ? 'One room. One board. Every class.' : 'One key. Every class.'}</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
