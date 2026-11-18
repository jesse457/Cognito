import { Link, router, usePage } from '@inertiajs/react';
import {
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
    UsersThree,
    X,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Avatar from '@/components/ui/Avatar';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Flash from '@/components/ui/Flash';
import { AccountMenu, BrandLink, exact, section, ShellFooter, SkipLink } from '@/layouts/chrome';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { AuthUser, SharedProps } from '@/types';

const STORAGE_KEY = 'cognita.sidebar';

/**
 * A navigation entry: where it goes, the glyph beside it, and when it counts
 * as the current page.
 */
type NavItem = [label: string, href: string, icon: Icon, matches: (path: string) => boolean];

type NavGroup = { heading: string; items: NavItem[] };

function navFor(user: AuthUser): NavGroup[] {
    const community: NavGroup = {
        heading: 'Community',
        items: [
            ['Feed', routes.questions.index, ChatsCircle, section(routes.questions.index)],
            ['Courses', routes.community.courses, Books, section(routes.community.courses)],
            ['Groups', routes.community.groups.index, UsersThree, section(routes.community.groups.index)],
        ],
    };

    if (user.role === 'instructor') {
        return [
            {
                heading: 'Teaching',
                items: [
                    ['Overview', routes.instructor.dashboard, SquaresFour, exact(routes.instructor.dashboard)],
                    ['Classes', routes.instructor.classrooms, ChalkboardTeacher, section(routes.instructor.classrooms)],
                    ['Students', routes.instructor.students, Student, section(routes.instructor.students)],
                    ['Attendance', routes.instructor.attendance, CalendarCheck, section(routes.instructor.attendance)],
                    ['My courses', routes.instructor.courses, Books, section(routes.instructor.courses)],
                ],
            },
            community,
        ];
    }

    return [
        {
            heading: 'My classroom',
            items: [
                ['Overview', routes.student.home, HouseLine, exact(routes.student.home)],
                ['My classes', routes.student.classrooms, ChalkboardTeacher, section(routes.student.classrooms)],
                ['Attendance', routes.student.attendance, CalendarCheck, section(routes.student.attendance)],
                ['Materials', routes.student.materials, FilePdf, section(routes.student.materials)],
            ],
        },
        community,
    ];
}

function SidebarNav({
    groups,
    path,
    collapsed,
    onNavigate,
}: {
    groups: NavGroup[];
    path: string;
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    return (
        <nav className="flex flex-col" aria-label="Dashboard">
            {groups.map((group, index) => (
                <div key={group.heading} className="flex flex-col gap-0.5">
                    {collapsed ? (
                        index > 0 ? <div className="mx-2 my-2 border-t border-line" /> : null
                    ) : (
                        <p className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-ink-soft uppercase first:pt-1">
                            {group.heading}
                        </p>
                    )}
                    {group.items.map(([label, href, Glyph, matches]) => {
                        const active = matches(path);

                        return (
                            <Link
                                key={label}
                                href={href}
                                onClick={onNavigate}
                                title={collapsed ? label : undefined}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors',
                                    collapsed && 'justify-center px-0',
                                    active
                                        ? 'bg-brand-soft font-medium text-brand'
                                        : 'text-ink-muted hover:bg-surface-sunken/60 hover:text-ink',
                                )}
                            >
                                <Glyph
                                    size={17}
                                    weight={active ? 'fill' : 'regular'}
                                    className={cn('shrink-0', !active && 'text-ink-soft')}
                                    aria-hidden="true"
                                />
                                <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
                            </Link>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}

/**
 * The body of the sidebar: the role and the navigation.
 *
 * The desktop rail and the phone drawer show exactly the same thing, so it is
 * written once and rendered twice.
 */
function SidebarBody({
    groups,
    path,
    collapsed,
    onNavigate,
}: {
    groups: NavGroup[];
    path: string;
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    return (
        <>
            <SidebarNav groups={groups} path={path} collapsed={collapsed} onNavigate={onNavigate} />
        </>
    );
}

/** The account at the bottom of the sidebar. */
function SidebarAccount({ user, collapsed }: { user: AuthUser; collapsed: boolean }) {
    return (
        <>
            <div
                className={cn(
                    'flex items-center gap-2.5 rounded-lg p-1.5',
                    collapsed && 'justify-center p-0',
                )}
                title={collapsed ? `${user.name} · ${user.role_label}` : undefined}
            >
                <Avatar name={user.name} size="sm" />
                {collapsed ? null : (
                    <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-[12.5px] font-medium text-ink">{user.name}</p>
                        <p className="truncate text-[11px] text-ink-soft">{user.role_label}</p>
                    </div>
                )}
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
        </>
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

    const groups = navFor(user);
    const current = groups.flatMap((group) => group.items).find(([, , , matches]) => matches(path));

    return (
        <div className="flex min-h-[100dvh] bg-canvas">
            <SkipLink />

            <aside
                className={cn(
                    'sticky top-0 hidden h-[100dvh] shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out lg:flex',
                    collapsed ? 'w-[64px]' : 'w-[236px]',
                )}
                aria-label="Sidebar"
            >
                <div
                    className={cn(
                        'flex h-14 items-center gap-2.5 border-b border-line px-4',
                        collapsed && 'justify-center px-0',
                    )}
                >
                    <BrandLink appName={appName} showName={!collapsed} />

                    {collapsed ? null : (
                        <button
                            type="button"
                            onClick={() => setCollapsed(true)}
                            className="btn btn-quiet btn-icon btn-sm ml-auto text-ink-soft"
                            title="Collapse sidebar"
                            aria-label="Collapse sidebar"
                        >
                            <CaretLineLeft size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>

                {collapsed ? (
                    <div className="flex justify-center border-b border-line py-2">
                        <button
                            type="button"
                            onClick={() => setCollapsed(false)}
                            className="btn btn-quiet btn-icon btn-sm text-ink-soft"
                            title="Expand sidebar"
                            aria-label="Expand sidebar"
                        >
                            <CaretLineRight size={16} aria-hidden="true" />
                        </button>
                    </div>
                ) : null}

                <div className="flex-1 overflow-y-auto px-3 py-4">
                    <SidebarBody groups={groups} path={path} collapsed={collapsed} />
                </div>

                <div className="border-t border-line p-3">
                    <SidebarAccount user={user} collapsed={collapsed} />
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
                        className="panel-in relative flex h-full w-[270px] max-w-[86vw] flex-col border-r border-line bg-surface shadow-float"
                        aria-label="Sidebar"
                    >
                        <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
                            <BrandLink appName={appName} compact={false} />

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
                            <SidebarBody
                                groups={groups}
                                path={path}
                                collapsed={false}
                                onNavigate={() => setMobileOpen(false)}
                            />
                        </div>

                        <div className="border-t border-line p-3">
                            <SidebarAccount user={user} collapsed={false} />
                        </div>
                    </aside>
                </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        className="btn btn-quiet btn-icon btn-sm lg:hidden"
                        aria-label="Open menu"
                    >
                        <List size={20} aria-hidden="true" />
                    </button>

                    <p className="truncate text-[13.5px] font-medium text-ink">{current?.[0] ?? 'Dashboard'}</p>

                    <div className="ml-auto flex items-center gap-1.5">
                        <AccountMenu user={user} />
                    </div>
                </header>

                <main id="main" className="flex-1">
                    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                        <div className="flex flex-col gap-6">
                            <Flash />
                            <ErrorBanner />
                            {children}
                        </div>
                    </div>
                </main>

                <ShellFooter
                    appName={appName}
                    right={user.role === 'instructor' ? 'One room. One board. Every class.' : 'One key. Every class.'}
                />
            </div>
        </div>
    );
}
