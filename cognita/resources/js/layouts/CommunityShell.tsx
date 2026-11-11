import { Link, router, usePage } from '@inertiajs/react';
import { ChalkboardTeacher, MagnifyingGlass, SignOut, Sparkle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Avatar from '@/components/ui/Avatar';
import Flash from '@/components/ui/Flash';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';

function CommunityLink({
    href,
    active,
    children,
    onNavigate,
}: {
    href: string;
    active: boolean;
    children: ReactNode;
    onNavigate?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'rounded-md px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                active
                    ? 'bg-surface-sunken text-ink'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
            )}
        >
            {children}
        </Link>
    );
}

/**
 * The community's own chrome: one top bar, no dashboard sidebar.
 *
 * Questions are a public-facing part of the product, so they keep the familiar
 * forum shape — logo, board navigation and search across the top — while the
 * class and attendance tools stay in the dashboard.
 */
export default function CommunityShell({ children }: { children: ReactNode }) {
    const page = usePage<SharedProps>();
    const { appName, auth } = page.props;
    const user = auth?.user ?? null;

    const current = new URL(page.url, 'http://localhost');
    const path = current.pathname;
    const scope = current.searchParams.get('scope') === 'community' ? 'community' : 'class';
    const sort = current.searchParams.get('sort') ?? 'newest';
    const query = current.searchParams.get('q') ?? '';
    const [term, setTerm] = useState(query);

    useEffect(() => {
        setTerm(query);
    }, [query]);

    const classHref = user?.role === 'instructor' ? routes.instructor.classrooms : routes.student.home;
    const communityHref = `${routes.questions.index}?scope=community`;
    const unansweredHref = `${routes.questions.index}?sort=unanswered`;
    const questionsActive = path.startsWith(routes.questions.index) && scope === 'class' && sort !== 'unanswered';
    const communityActive = path.startsWith(routes.questions.index) && scope === 'community';
    const unansweredActive = path.startsWith(routes.questions.index) && sort === 'unanswered';

    function search(event: FormEvent): void {
        event.preventDefault();

        router.get(
            routes.questions.index,
            {
                ...(path.startsWith(routes.questions.index) && scope === 'community'
                    ? { scope: 'community' }
                    : {}),
                ...(term.trim() === '' ? {} : { q: term.trim() }),
            },
            { preserveScroll: false },
        );
    }

    return (
        <div className="flex min-h-[100dvh] flex-col bg-canvas">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-ink"
            >
                Skip to content
            </a>

            <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md">
                <div className="mx-auto flex h-14 w-full max-w-[1264px] items-center gap-2 px-3 sm:px-6">
                    <Link
                        href={routes.questions.index}
                        className="flex shrink-0 items-center gap-2.5"
                        aria-label={`${appName} community`}
                    >
                        <span className="brand-mark h-8 w-8 rounded-[10px] text-[13px]" aria-hidden="true">
                            C
                        </span>
                        <span className="hidden leading-tight sm:block">
                            <span className="block text-[15px] font-semibold tracking-tight">{appName}</span>
                            <span className="block text-[10px] font-medium tracking-[0.14em] text-ink-soft uppercase">
                                Community
                            </span>
                        </span>
                    </Link>

                    <nav className="ml-1 hidden items-center gap-0.5 md:flex" aria-label="Community">
                        <CommunityLink href={routes.questions.index} active={questionsActive}>
                            Questions
                        </CommunityLink>
                        <CommunityLink href={communityHref} active={communityActive}>
                            Community
                        </CommunityLink>
                        <CommunityLink href={unansweredHref} active={unansweredActive}>
                            Unanswered
                        </CommunityLink>
                    </nav>

                    <form onSubmit={search} className="mx-2 hidden min-w-0 flex-1 md:block">
                        <label className="relative block">
                            <span className="sr-only">Search questions</span>
                            <MagnifyingGlass
                                size={15}
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft"
                                aria-hidden="true"
                            />
                            <input
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                                className="input h-9 py-0 pr-9 pl-9 text-sm"
                                placeholder="Search questions and answers"
                            />
                            <Sparkle
                                size={13}
                                weight="fill"
                                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-brand/60"
                                aria-hidden="true"
                            />
                        </label>
                    </form>

                    <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
                        <ThemeToggle />
                        {user ? (
                            <>
                                <Link
                                    href={classHref}
                                    className="btn btn-quiet btn-icon btn-sm"
                                    title="Back to classes"
                                    aria-label="Back to classes"
                                >
                                    <ChalkboardTeacher size={18} aria-hidden="true" />
                                </Link>

                                <div className="hidden items-center gap-2 border-l border-line pl-2 lg:flex">
                                    <Avatar name={user.name} size="sm" />
                                    <div className="leading-tight">
                                        <p className="max-w-[16ch] truncate text-[12px] font-medium text-ink">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] text-ink-muted">{user.role_label}</p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => router.post(routes.logout)}
                                    className="btn btn-quiet btn-icon btn-sm"
                                    title="Sign out"
                                    aria-label="Sign out"
                                >
                                    <SignOut size={17} aria-hidden="true" />
                                </button>
                            </>
                        ) : (
                            <Link href={routes.login} className="btn btn-primary btn-sm">
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>

                <nav
                    className="mx-auto flex w-full max-w-[1264px] gap-1 overflow-x-auto border-t border-line px-3 py-1.5 md:hidden"
                    aria-label="Community"
                >
                    <CommunityLink href={routes.questions.index} active={questionsActive}>
                        Questions
                    </CommunityLink>
                    <CommunityLink href={communityHref} active={communityActive}>
                        Community
                    </CommunityLink>
                    <CommunityLink href={unansweredHref} active={unansweredActive}>
                        Unanswered
                    </CommunityLink>
                </nav>
            </header>

            <main id="main" className="flex-1">
                <div className="mx-auto w-full max-w-[1264px] px-3 py-5 sm:px-6 sm:py-7">
                    <Flash />
                    {children}
                </div>
            </main>
        </div>
    );
}
