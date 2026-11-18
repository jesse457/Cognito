import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, ChatsCircle, CheckCircle, Plus, Sparkle, UsersThree } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import AskPostModal, { type CommunityGroupOption } from '@/components/community/AskPostModal';
import TagList from '@/components/questions/TagList';
import VoteControl from '@/components/questions/VoteControl';
import EmptyState from '@/components/ui/EmptyState';
import Lightbox from '@/components/ui/Lightbox';
import Pagination from '@/components/ui/Pagination';
import SearchInput from '@/components/ui/SearchInput';
import { routes } from '@/lib/routes';
import type { Paginated, PostMedia, SharedProps } from '@/types';

type Scope = 'all' | 'general' | 'group' | 'mine';
type Sort = 'newest' | 'top' | 'unanswered';

interface PostRow {
    id: number;
    title: string;
    excerpt: string;
    tags: string[];
    score: number;
    answers_count: number;
    media_count: number;
    media: PostMedia[];
    accepted: boolean;
    my_vote: number;
    can_vote: boolean;
    mine: boolean;
    created_at: string;
    user: { id: number; name: string };
    group: { id: number; name: string } | null;
    href: string;
}

interface GroupRow extends CommunityGroupOption {
    description: string | null;
    members_count: number;
    posts_count: number;
    href: string;
}

interface FeedProps {
    filters: { q: string; scope: Scope; group: number | null; sort: Sort };
    stats: { posts: number; answers: number; solved: number; unanswered: number; mine: number };
    groups: GroupRow[];
    posts: Paginated<PostRow>;
    search: {
        mode: 'none' | 'keyword' | 'semantic';
        term: string;
        total: number;
        answers: Array<{ post_id: number; post_title: string; answer_id: number; excerpt: string; href: string }>;
    };
}

const SCOPES: Array<{ value: Scope; label: string; hint: string }> = [
    { value: 'all', label: 'Everything', hint: 'Every public post in the community' },
    { value: 'general', label: 'Community', hint: 'Posts everyone can see' },
    { value: 'mine', label: 'My groups', hint: 'Posts from the groups you joined' },
];

const SORTS: Array<{ value: Sort; label: string }> = [
    { value: 'newest', label: 'Newest' },
    { value: 'top', label: 'Top voted' },
    { value: 'unanswered', label: 'Unanswered' },
];

export default function Feed({ filters, stats, groups, posts, search }: FeedProps) {
    const page = usePage<SharedProps>();
    const [asking, setAsking] = useState(false);
    const [term, setTerm] = useState(filters.q);
    const [lightbox, setLightbox] = useState<{ images: PostMedia[]; index: number } | null>(null);

    const groupOptions = useMemo<CommunityGroupOption[]>(
        () => groups.map(({ id, name, joined }) => ({ id, name, joined })),
        [groups],
    );

    function hrefFor(scope: Scope, group: number | null = null, sort: Sort = filters.sort): string {
        const params = new URLSearchParams({ scope, sort });

        if (group !== null) {
            params.set('group', String(group));
        }

        if (filters.q !== '') {
            params.set('q', filters.q);
        }

        return `${routes.questions.index}?${params.toString()}`;
    }

    function go(next: { scope?: Scope; group?: number | null; sort?: Sort; q?: string }): void {
        router.get(
            routes.questions.index,
            {
                scope: next.scope ?? filters.scope,
                group: next.group !== undefined ? next.group : filters.group,
                sort: next.sort ?? filters.sort,
                q: next.q ?? filters.q,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    const heading = filters.scope === 'group'
        ? groups.find((group) => group.id === filters.group)?.name ?? 'Group'
        : SCOPES.find((scope) => scope.value === filters.scope)?.label ?? 'Everything';

    return (
        <>
            <Head title="Community" />

            <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_300px]">
                <aside className="hidden flex-col gap-4 lg:flex">
                    <div className="card p-3">
                        <p className="px-2 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
                            Feed
                        </p>
                        <nav className="flex flex-col gap-0.5" aria-label="Feed scope">
                            {SCOPES.map((scope) => (
                                <Link
                                    key={scope.value}
                                    href={hrefFor(scope.value)}
                                    className={`rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                                        filters.scope === scope.value
                                            ? 'bg-brand-soft font-medium text-brand'
                                            : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                                    }`}
                                >
                                    {scope.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="card p-3">
                        <div className="flex items-center justify-between px-2 pb-1.5">
                            <p className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-soft uppercase">Groups</p>
                            <Link href={routes.community.groups.index} className="text-ink-soft hover:text-brand" title="All groups">
                                <ArrowUpRight size={14} aria-hidden="true" />
                            </Link>
                        </div>
                        <nav className="flex flex-col gap-0.5" aria-label="Groups">
                            {groups.slice(0, 8).map((group) => (
                                <Link
                                    key={group.id}
                                    href={hrefFor('group', group.id)}
                                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors ${
                                        filters.scope === 'group' && filters.group === group.id
                                            ? 'bg-mentor-soft font-medium text-mentor'
                                            : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                                    }`}
                                >
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-[10px] font-semibold">
                                        {group.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{group.name}</span>
                                    <span className="text-[11px] text-ink-soft">{group.posts_count}</span>
                                </Link>
                            ))}
                            {groups.length === 0 ? <p className="px-2.5 py-2 text-[12px] text-ink-soft">No groups yet.</p> : null}
                        </nav>
                        <Link href={routes.community.groups.index} className="btn btn-quiet btn-sm mt-2 w-full justify-start">
                            <Plus size={14} aria-hidden="true" />
                            Find or start a group
                        </Link>
                    </div>
                </aside>

                <section className="flex min-w-0 flex-col gap-4">
                    <div className="card flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                            <h1 className="section-title">{heading}</h1>
                            <p className="meta mt-0.5">
                                {stats.posts} posts · {stats.answers} answers · {stats.solved} solved
                            </p>
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setAsking(true)}>
                            <Plus size={15} weight="bold" aria-hidden="true" />
                            Start a post
                        </button>
                    </div>

                    <div className="card flex flex-wrap items-center gap-2 p-2.5">
                        <div className="min-w-[180px] flex-1">
                            <SearchInput
                                value={term}
                                onChange={setTerm}
                                ariaLabel="Search posts"
                                placeholder="Search posts and answers"
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            {SORTS.map((sort) => (
                                <button
                                    key={sort.value}
                                    type="button"
                                    onClick={() => go({ sort: sort.value })}
                                    className={`btn btn-sm ${filters.sort === sort.value ? 'btn-tonal' : 'btn-quiet'}`}
                                >
                                    {sort.label}
                                </button>
                            ))}
                        </div>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => go({ q: term })}>
                            Search
                        </button>
                        {filters.q !== '' || filters.scope !== 'all' ? (
                            <button type="button" className="btn btn-quiet btn-sm" onClick={() => go({ q: '', scope: 'all', group: null })}>
                                Reset
                            </button>
                        ) : null}
                    </div>

                    {search.mode === 'semantic' ? (
                        <div className="rounded-xl border border-brand/25 bg-brand-soft/50 p-3 text-[12.5px] text-ink-muted">
                            <span className="inline-flex items-center gap-1.5 font-medium text-brand">
                                <Sparkle size={14} aria-hidden="true" />
                                Semantic matches
                            </span>
                            <span className="ml-2">{search.total} results for “{search.term}”.</span>
                            {search.answers.length > 0 ? (
                                <ul className="mt-2 flex flex-col gap-1">
                                    {search.answers.slice(0, 3).map((answer) => (
                                        <li key={answer.answer_id}>
                                            <Link href={answer.href} className="text-brand hover:underline">
                                                {answer.post_title}
                                            </Link>
                                            <span className="ml-2 text-ink-soft">— {answer.excerpt}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ) : null}

                    {posts.data.length === 0 ? (
                        <EmptyState
                            title="Nothing here yet"
                            body="Be the first to post, or change the filters to see more of the community."
                            action={
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => setAsking(true)}>
                                    Start a post
                                </button>
                            }
                        />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {posts.data.map((post) => (
                                <li key={post.id} className="card p-4 transition hover:border-line-strong">
                                    <div className="flex gap-3">
                                        <VoteControl
                                            score={post.score}
                                            myVote={post.my_vote}
                                            canVote={post.can_vote}
                                            endpoint={routes.questions.vote(post.id)}
                                            size="sm"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
                                                <span className="font-medium text-ink">{post.user.name}</span>
                                                <span aria-hidden="true">·</span>
                                                <span>{post.created_at}</span>
                                                {post.group ? (
                                                    <Link
                                                        href={hrefFor('group', post.group.id)}
                                                        className="chip chip-mentor"
                                                    >
                                                        {post.group.name}
                                                    </Link>
                                                ) : (
                                                    <span className="chip">Community</span>
                                                )}
                                                {post.accepted ? (
                                                    <span className="inline-flex items-center gap-1 text-live">
                                                        <CheckCircle size={13} aria-hidden="true" />
                                                        Solved
                                                    </span>
                                                ) : null}
                                            </div>
                                            <Link href={post.href} className="block text-[14.5px] font-semibold text-ink hover:text-brand">
                                                {post.title}
                                            </Link>
                                            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{post.excerpt}</p>
                                            {post.media.length > 0 ? (
                                                <div className="mt-2.5 flex flex-wrap gap-2">
                                                    {post.media.slice(0, 4).map((image, imageIndex) => (
                                                        <button
                                                            key={image.id}
                                                            type="button"
                                                            onClick={() => setLightbox({ images: post.media, index: imageIndex })}
                                                            className="overflow-hidden rounded-lg border border-line transition hover:border-line-strong"
                                                            aria-label={`View ${image.name}`}
                                                        >
                                                            <img
                                                                src={image.url}
                                                                alt={image.name}
                                                                loading="lazy"
                                                                className="h-16 w-20 object-cover sm:h-20 sm:w-28"
                                                            />
                                                        </button>
                                                    ))}
                                                    {post.media_count > 4 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setLightbox({ images: post.media, index: 0 })}
                                                            className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-sunken text-[11px] font-medium text-ink-muted sm:h-20 sm:w-20"
                                                        >
                                                            +{post.media_count - 4}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                                <TagList tags={post.tags} />
                                            </div>
                                        </div>
                                        <Link href={post.href} className="btn btn-quiet btn-sm self-start" title="Open post">
                                            <ChatsCircle size={15} aria-hidden="true" />
                                            <span>{post.answers_count}</span>
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination paginator={posts} />
                </section>

                <aside className="hidden flex-col gap-4 xl:flex">
                    <div className="card p-4">
                        <p className="section-title">Your community</p>
                        <dl className="mt-3 flex flex-col gap-2 text-[13px]">
                            <div className="flex items-center justify-between">
                                <dt className="text-ink-muted">Posts</dt>
                                <dd className="font-semibold tabular">{stats.posts}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-ink-muted">Answers</dt>
                                <dd className="font-semibold tabular">{stats.answers}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-ink-muted">Unanswered</dt>
                                <dd className="font-semibold tabular">{stats.unanswered}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-ink-muted">Your posts</dt>
                                <dd className="font-semibold tabular">{stats.mine}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="card p-4">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mentor-soft text-mentor">
                            <UsersThree size={18} aria-hidden="true" />
                        </span>
                        <p className="mt-2.5 text-[13.5px] font-semibold text-ink">Learn together</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                            Groups are where course questions live. Start one for your cohort, or join a group already asking.
                        </p>
                        <Link href={routes.community.groups.index} className="btn btn-outline btn-sm mt-3 w-full">
                            Browse groups
                        </Link>
                    </div>

                    <div className="card p-4">
                        <p className="section-title">Courses</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                            Browse free and paid courses, open their materials and follow your progress.
                        </p>
                        <Link href={routes.community.courses} className="btn btn-outline btn-sm mt-3 w-full">
                            Course library
                        </Link>
                    </div>

                    {page.props.auth.user?.role === 'instructor' ? (
                        <div className="card p-4">
                            <p className="section-title">Teaching</p>
                            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                                Your classes, calls and attendance stay in the dashboard.
                            </p>
                            <Link href={routes.instructor.dashboard} className="btn btn-quiet btn-sm mt-3 w-full">
                                Go to dashboard
                            </Link>
                        </div>
                    ) : null}
                </aside>
            </div>

            <AskPostModal
                open={asking}
                groups={groupOptions}
                defaultGroupId={filters.scope === 'group' ? filters.group : null}
                onClose={() => setAsking(false)}
            />

            <Lightbox
                images={lightbox?.images ?? []}
                index={lightbox?.index ?? null}
                onIndexChange={(index) => setLightbox((current) => current === null ? null : { ...current, index })}
                onClose={() => setLightbox(null)}
            />
        </>
    );
}
