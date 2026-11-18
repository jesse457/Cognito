import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Books, ChatsCircle, MagnifyingGlass, UsersThree } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Flash from '@/components/ui/Flash';
import { AccountMenu, BrandLink, ShellFooter, SignInLink, SkipLink } from '@/layouts/chrome';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';

function shellLink(href: string, active: boolean, children: ReactNode): ReactNode {
    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
            )}
        >
            {children}
        </Link>
    );
}

/**
 * The community is the learning platform: a feed, a course library and groups.
 * Classes, calls and attendance stay in the dashboard, one link away.
 */
export default function CommunityShell({ children }: { children: ReactNode }) {
    const page = usePage<SharedProps>();
    const { appName, auth } = page.props;
    const user = auth?.user ?? null;
    const path = page.url.split('?')[0] ?? '/';
    const query = new URLSearchParams(page.url.split('?')[1] ?? '');
    const [term, setTerm] = useState(query.get('q') ?? '');

    useEffect(() => {
        setTerm(new URLSearchParams(page.url.split('?')[1] ?? '').get('q') ?? '');
    }, [page.url]);

    const feedActive = path === routes.questions.index || path.startsWith('/questions/');
    const coursesActive = path.startsWith('/community/courses') || path.startsWith('/community/lessons');
    const groupsActive = path.startsWith('/community/groups');
    const dashboardHref = user?.role === 'instructor' ? routes.instructor.dashboard : routes.student.home;

    function search(event: FormEvent): void {
        event.preventDefault();

        router.get(routes.questions.index, term.trim() === '' ? {} : { q: term.trim() }, { preserveScroll: false });
    }

    return (
        <div className="flex min-h-[100dvh] flex-col bg-canvas">
            <div className="h-1 w-full bg-brand" aria-hidden="true" />
            <SkipLink />

            <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md">
                <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6">
                    <BrandLink appName={appName} href={routes.questions.index} subtitle="Community" />

                    <nav className="ml-3 hidden items-center gap-1 md:flex" aria-label="Community">
                        {shellLink(routes.questions.index, feedActive, <><ChatsCircle size={15} className="mr-1.5" aria-hidden="true" />Feed</>)}
                        {shellLink(routes.community.courses, coursesActive, <><Books size={15} className="mr-1.5" aria-hidden="true" />Courses</>)}
                        {shellLink(routes.community.groups.index, groupsActive, <><UsersThree size={15} className="mr-1.5" aria-hidden="true" />Groups</>)}
                    </nav>

                    <form onSubmit={search} className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
                        <label className="relative block">
                            <span className="sr-only">Search the community</span>
                            <MagnifyingGlass size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                            <input
                                className="input pl-8"
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                                placeholder="Search posts and answers"
                            />
                        </label>
                    </form>

                    <div className="ml-auto flex items-center gap-2 md:ml-0">
                        {user ? (
                            <>
                                <Link href={dashboardHref} className="btn btn-quiet btn-sm hidden lg:inline-flex" title="Back to dashboard">
                                    <ArrowLeft size={14} aria-hidden="true" />
                                    Dashboard
                                </Link>
                                <div className="border-l border-line pl-2">
                                    <AccountMenu user={user} />
                                </div>
                            </>
                        ) : (
                            <SignInLink />
                        )}
                    </div>
                </div>

                <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-3 py-1.5 md:hidden" aria-label="Community sections">
                    {shellLink(routes.questions.index, feedActive, 'Feed')}
                    {shellLink(routes.community.courses, coursesActive, 'Courses')}
                    {shellLink(routes.community.groups.index, groupsActive, 'Groups')}
                    {user ? shellLink(dashboardHref, false, 'Dashboard') : null}
                    <form onSubmit={search} className="ml-auto min-w-[130px]" role="search">
                        <label className="relative block">
                            <span className="sr-only">Search the community</span>
                            <MagnifyingGlass size={14} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                            <input
                                className="input h-8 pl-7 text-[12px]"
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                                placeholder="Search"
                            />
                        </label>
                    </form>
                </nav>
            </header>

            <main id="main" className="flex-1">
                <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6">
                    <div className="flex flex-col gap-6">
                        <Flash />
                        <ErrorBanner />
                        {children}
                    </div>
                </div>
            </main>

            <ShellFooter appName={appName} right="Learn together, at your own pace." />
        </div>
    );
}
