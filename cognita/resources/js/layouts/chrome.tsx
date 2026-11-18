/**
 * The chrome every shell shares.
 *
 * Four shells — the product bar, the dashboard, the community board and the
 * guest page — used to spell the same skip link, the same brand mark, the same
 * account block and the same sign-out button out longhand. They live here now,
 * once, so a change to the account menu is a change in one place.
 */
import { Link, router } from '@inertiajs/react';
import { Books, CaretDown, ChatsCircle, HouseLine, SignOut, UserCircle } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Avatar from '@/components/ui/Avatar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/types';

/**
 * A navigation entry: where it goes, and when it counts as the current page.
 *
 * `exact` is for a landing page, `section` for everything under it.
 */
export type NavEntry = [label: string, href: string, matches: (path: string) => boolean];

export const exact = (href: string): NavEntry[2] => (path: string) => path === href;

export const section = (href: string): NavEntry[2] => (path: string) =>
    path === href || path.startsWith(`${href}/`);

/** The first thing a keyboard reaches, on every page. */
export function SkipLink(): ReactNode {
    return (
        <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-ink"
        >
            Skip to content
        </a>
    );
}

/**
 * The mark and the name, linking home.
 *
 * `compact` hides the name on a narrow screen, which is what a top bar wants;
 * a drawer that has room for it passes `compact={false}`.
 */
export function BrandLink({
    appName,
    href = routes.dashboard,
    subtitle,
    showName = true,
    compact = true,
}: {
    appName: string;
    href?: string;
    subtitle?: string;
    showName?: boolean;
    compact?: boolean;
}): ReactNode {
    return (
        <Link href={href} className="flex items-center gap-2.5" aria-label={`${appName} home`}>
            <span className="brand-mark shrink-0" aria-hidden="true">
                C
            </span>
            {showName ? (
                <span className={cn('leading-tight', compact && 'hidden sm:block')}>
                    <span className="block text-[14px] font-semibold tracking-[-0.01em]">{appName}</span>
                    {subtitle ? (
                        <span className="block text-[11px] font-medium text-ink-soft">{subtitle}</span>
                    ) : null}
                </span>
            ) : null}
        </Link>
    );
}

/** The signed-in account: picture, name and role. */
export function AccountBadge({ user }: { user: AuthUser }): ReactNode {
    return (
        <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 leading-tight">
                <p className="max-w-[18ch] truncate text-[12.5px] font-medium text-ink">{user.name}</p>
                <p className="truncate text-[11px] text-ink-soft">{user.role_label}</p>
            </div>
        </div>
    );
}

/** The account menu: who you are, where you can go, and the way out. */
export function AccountMenu({ user }: { user: AuthUser }): ReactNode {
    const [open, setOpen] = useState(false);
    const wrapper = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (! open) {
            return;
        }

        const onPointerDown = (event: MouseEvent): void => {
            if (wrapper.current !== null && ! wrapper.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const dashboardHref = user.role === 'admin'
        ? routes.admin.dashboard
        : user.role === 'instructor'
            ? routes.instructor.dashboard
            : routes.student.home;

    const links = [
        { label: 'Your profile', href: routes.profile, icon: UserCircle },
        { label: 'Dashboard', href: dashboardHref, icon: HouseLine },
        ...(user.role === 'admin'
            ? []
            : [
                { label: 'Community', href: routes.questions.index, icon: ChatsCircle },
                { label: 'Courses', href: routes.community.courses, icon: Books },
            ]),
    ];

    return (
        <div className="relative" ref={wrapper}>
            <button
                type="button"
                onClick={() => setOpen((value) => ! value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Account menu for ${user.name}`}
                className={cn(
                    'flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-sunken',
                    open && 'bg-surface-sunken',
                )}
            >
                <Avatar name={user.name} size="sm" />
                <span className="hidden max-w-[16ch] truncate text-[12.5px] font-medium text-ink md:block">
                    {user.name}
                </span>
                <CaretDown size={12} className="hidden text-ink-soft md:block" aria-hidden="true" />
            </button>

            {open ? (
                <div
                    role="menu"
                    aria-label="Account"
                    className="panel-in absolute top-[calc(100%+8px)] right-0 z-50 w-[250px] overflow-hidden rounded-xl border border-line bg-surface shadow-float"
                >
                    <div className="border-b border-line px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                            <Avatar name={user.name} size="md" />
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
                                <p className="truncate text-[11.5px] text-ink-soft">{user.email}</p>
                            </div>
                        </div>
                        <span className="chip chip-neutral mt-2.5">{user.role_label}</span>
                    </div>

                    <nav className="flex flex-col gap-0.5 p-1.5" aria-label="Account links">
                        {links.map(({ label, href, icon: Icon }) => (
                            <Link
                                key={label}
                                href={href}
                                role="menuitem"
                                onClick={() => setOpen(false)}
                                className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                            >
                                <Icon size={15} className="shrink-0 text-ink-soft" aria-hidden="true" />
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <div className="border-t border-line p-1.5">
                        <ThemeToggle showLabel className="border-0 bg-transparent hover:bg-surface-sunken" />
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => router.post(routes.logout)}
                            className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] text-danger transition-colors hover:bg-danger-soft"
                        >
                            <SignOut size={15} className="shrink-0" aria-hidden="true" />
                            Sign out
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

/** Leave. Every shell has exactly one of these. */
export function SignOutButton(): ReactNode {
    return (
        <button
            type="button"
            className="btn btn-quiet btn-icon btn-sm"
            onClick={() => router.post(routes.logout)}
            title="Sign out"
            aria-label="Sign out"
        >
            <SignOut size={16} aria-hidden="true" />
        </button>
    );
}

/** The thin strip at the bottom of the product surfaces. */
export function ShellFooter({ appName, right }: { appName: string; right: string }): ReactNode {
    return (
        <footer className="border-t border-line px-4 py-4 text-[11px] text-ink-soft sm:px-6">
            <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-2">
                <span>{appName} · courses, classes and live group calls</span>
                <span>{right}</span>
            </div>
        </footer>
    );
}

/** The door, for a visitor who is not signed in. */
export function SignInLink(): ReactNode {
    return (
        <Link href={routes.login} className="btn btn-primary btn-sm">
            Sign in
        </Link>
    );
}
