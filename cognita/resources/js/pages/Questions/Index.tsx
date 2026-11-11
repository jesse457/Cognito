import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ChartBar,
    ChatsCircle,
    CheckCircle,
    ImageSquare,
    Lightbulb,
    MagnifyingGlass,
    Plus,
    Sparkle,
    UsersThree,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AskQuestionModal from '@/components/questions/AskQuestionModal';
import type { QuestionClassroomOption } from '@/components/questions/AskQuestionModal';
import VoteControl from '@/components/questions/VoteControl';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

type QuestionSort = 'newest' | 'top' | 'unanswered';
type QuestionScope = 'class' | 'community';

interface QuestionRow {
    id: number;
    title: string;
    excerpt: string;
    tags: string[];
    visibility: 'classroom' | 'community';
    score: number;
    answers_count: number;
    media_count: number;
    accepted: boolean;
    my_vote: number;
    can_vote: boolean;
    mine: boolean;
    created_at: string;
    user: { id: number; name: string };
    classroom: { id: number; name: string } | null;
    match_kind: 'question' | 'answer' | null;
    match_excerpt: string | null;
    match_answer_id: number | null;
    href: string;
}

interface AnswerMatch {
    question_id: number;
    question_title: string;
    answer_id: number;
    excerpt: string;
    href: string;
}

interface QuestionSearchView {
    mode: 'none' | 'keyword' | 'semantic';
    term: string;
    total: number;
    answers: AnswerMatch[];
}

interface QuestionsPageProps {
    filters: { q: string; classroom: number | null; sort: QuestionSort; scope: QuestionScope };
    stats: {
        questions: number;
        answers: number;
        solved: number;
        unanswered: number;
        unaccepted: number;
        mine: number;
    };
    classrooms: QuestionClassroomOption[];
    questions: Paginated<QuestionRow>;
    search: QuestionSearchView;
    canAsk: boolean;
}

const SORTS: Array<{ value: QuestionSort; label: string }> = [
    { value: 'newest', label: 'Newest' },
    { value: 'top', label: 'Top voted' },
    { value: 'unanswered', label: 'Unanswered' },
];

function BoardLink({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                active
                    ? 'bg-surface-sunken text-ink'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
            )}
        >
            {children}
        </Link>
    );
}

function StatRow({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-[13px] text-ink-muted">{label}</dt>
            <dd className="text-[13px] font-semibold text-ink tabular">{value}</dd>
        </div>
    );
}

export default function QuestionsIndex({ filters, stats, classrooms, questions, search, canAsk }: QuestionsPageProps) {
    const role = usePage<SharedProps>().props.auth?.user?.role;
    const instructor = role === 'instructor';
    const [asking, setAsking] = useState(false);
    const [q, setQ] = useState(filters.q);
    const [classroom, setClassroom] = useState(filters.classroom === null ? '' : String(filters.classroom));
    const [sort, setSort] = useState<QuestionSort>(filters.sort);

    useEffect(() => {
        setQ(filters.q);
        setClassroom(filters.classroom === null ? '' : String(filters.classroom));
        setSort(filters.sort);
    }, [filters.q, filters.classroom, filters.sort]);

    function navigate(overrides: { q?: string; classroom?: string; sort?: QuestionSort } = {}): void {
        const nextQ = overrides.q ?? q;
        const nextClassroom = overrides.classroom ?? classroom;
        const nextSort = overrides.sort ?? sort;

        router.get(
            routes.questions.index,
            {
                scope: filters.scope === 'community' ? 'community' : undefined,
                q: nextQ.trim() === '' ? undefined : nextQ.trim(),
                classroom: nextClassroom === '' ? undefined : nextClassroom,
                sort: nextSort === 'newest' ? undefined : nextSort,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function submit(event: FormEvent): void {
        event.preventDefault();
        navigate();
    }

    function changeSort(next: QuestionSort): void {
        setSort(next);
        navigate({ sort: next });
    }

    function reset(): void {
        setQ('');
        setClassroom('');
        setSort('newest');
        router.get(
            routes.questions.index,
            filters.scope === 'community' ? { scope: 'community' } : {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    const filtering = filters.q !== '' || filters.classroom !== null || filters.sort !== 'newest';
    const community = filters.scope === 'community';
    const unansweredHref = filters.scope === 'community'
        ? `${routes.questions.index}?scope=community&sort=unanswered`
        : `${routes.questions.index}?sort=unanswered`;
    const classHref = role === 'instructor' ? routes.instructor.classrooms : routes.student.home;
    const allActive = !community && filters.sort !== 'unanswered';
    const unansweredActive = !community && filters.sort === 'unanswered';
    const communityActive = community && filters.sort !== 'unanswered';
    const communityUnansweredActive = community && filters.sort === 'unanswered';

    return (
        <>
            <Head title="Questions" />

            <div className="grid gap-6 lg:grid-cols-[168px_minmax(0,1fr)] xl:grid-cols-[168px_minmax(0,1fr)_300px]">
                <aside className="hidden lg:block">
                    <div className="sticky top-[76px] flex flex-col gap-4">
                        <nav className="flex flex-col gap-0.5" aria-label="Question board">
                            <p className="eyebrow px-2.5 pb-1.5">{instructor ? 'Instructor desk' : 'Questions'}</p>
                            <BoardLink href={routes.questions.index} active={allActive}>
                                All questions
                            </BoardLink>
                            <BoardLink href={`${routes.questions.index}?sort=unanswered`} active={unansweredActive}>
                                Unanswered
                            </BoardLink>
                            <BoardLink href={`${routes.questions.index}?scope=community`} active={communityActive}>
                                Community
                            </BoardLink>
                            <BoardLink
                                href={`${routes.questions.index}?scope=community&sort=unanswered`}
                                active={communityUnansweredActive}
                            >
                                Community unanswered
                            </BoardLink>

                            <div className="my-2 border-t border-line" />

                            <BoardLink href={classHref} active={false}>
                                My classes
                            </BoardLink>
                        </nav>

                        {canAsk ? (
                            <Button
                                variant="tonal"
                                className="justify-center"
                                onClick={() => setAsking(true)}
                            >
                                <Plus size={16} weight="bold" aria-hidden="true" />
                                {instructor ? 'Ask as instructor' : 'Ask a question'}
                            </Button>
                        ) : null}
                    </div>
                </aside>

                <section className="min-w-0">
                    <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="eyebrow">{instructor ? 'Instructor triage' : 'Question board'}</p>
                                {instructor ? <span className="chip chip-mentor">Instructor view</span> : null}
                            </div>
                            <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight text-ink sm:text-[30px]">
                                {instructor
                                    ? community
                                        ? 'Community desk'
                                        : 'Question desk'
                                    : community
                                      ? 'Community questions'
                                      : 'All questions'}
                            </h1>
                            <p className="meta mt-1.5 max-w-xl leading-relaxed">
                                {instructor
                                    ? community
                                        ? 'Triage what the school is asking, answer with context, and accept a clear solution when the thread is done.'
                                        : 'See where your classes are stuck, answer with context, and close the loop by accepting a clear solution.'
                                    : `${pluralize(questions.total, 'question')} ${community ? 'across the school board' : 'from your classes'}${filtering ? ' matching these filters' : ''}`}
                            </p>
                        </div>

                        {canAsk ? (
                            <Button variant="primary" onClick={() => setAsking(true)}>
                                <Plus size={16} weight="bold" aria-hidden="true" />
                                {instructor ? 'Ask as instructor' : 'Ask a question'}
                            </Button>
                        ) : null}
                    </div>

                    {instructor ? (
                        <div className="mb-4 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-xl border border-mentor/25 bg-mentor-soft/45 p-3">
                                <p className="eyebrow text-mentor">Waiting on a reply</p>
                                <p className="mt-1 text-xl font-semibold text-ink tabular">{stats.unanswered}</p>
                                <p className="meta mt-0.5">No answer yet</p>
                            </div>
                            <div className="rounded-xl border border-line bg-surface p-3">
                                <p className="eyebrow">Needs acceptance</p>
                                <p className="mt-1 text-xl font-semibold text-ink tabular">{stats.unaccepted}</p>
                                <p className="meta mt-0.5">Answered, not closed</p>
                            </div>
                            <div className="rounded-xl border border-line bg-surface p-3">
                                <p className="eyebrow">Solved</p>
                                <p className="mt-1 text-xl font-semibold text-ink tabular">{stats.solved}</p>
                                <p className="meta mt-0.5">Accepted answers</p>
                            </div>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 border-y border-line py-2.5">
                        <div className="flex items-center gap-0.5">
                            {SORTS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => changeSort(option.value)}
                                    aria-pressed={sort === option.value}
                                    className={cn(
                                        'rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                                        sort === option.value
                                            ? 'bg-surface-sunken text-ink'
                                            : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            {community || classrooms.length === 0 ? null : (
                                <div className="w-[210px]">
                                    <Select
                                        value={classroom}
                                        onChange={(next) => {
                                            setClassroom(next);
                                            navigate({ classroom: next });
                                        }}
                                        size="sm"
                                        ariaLabel="Filter by class"
                                        options={[
                                            { value: '', label: 'All my classes' },
                                            ...classrooms.map((option) => ({
                                                value: String(option.id),
                                                label:
                                                    option.course === null
                                                        ? option.name
                                                        : `${option.name} · ${option.course}`,
                                            })),
                                        ]}
                                    />
                                </div>
                            )}

                            {filtering ? (
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                                >
                                    Reset
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <form onSubmit={submit} className="flex gap-2 py-3 md:hidden">
                        <label className="relative block flex-1">
                            <span className="sr-only">Search questions and answers</span>
                            <MagnifyingGlass
                                size={15}
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft"
                                aria-hidden="true"
                            />
                            <input
                                value={q}
                                onChange={(event) => setQ(event.target.value)}
                                className="input h-9 py-0 pr-3 pl-9 text-sm"
                                placeholder="Search questions and answers"
                            />
                        </label>
                        <Button type="submit" variant="outline" size="sm">
                            Search
                        </Button>
                    </form>

                    {search.mode === 'semantic' ? (
                        <div className="mb-4 rounded-xl border border-brand/25 bg-brand-soft/45 p-4">
                            <div className="flex items-start gap-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-surface">
                                    <Sparkle size={16} weight="fill" aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-ink">
                                        Meaning-based matches for “{search.term}”
                                    </p>
                                    <p className="meta mt-0.5 leading-relaxed">
                                        Closest threads by meaning, with exact-word matches kept in the list.{' '}
                                        {pluralize(search.total, 'thread')} matched
                                        {search.answers.length === 0
                                            ? '.'
                                            : `, including ${pluralize(search.answers.length, 'answer')}.`}
                                    </p>
                                </div>
                            </div>

                            {search.answers.length === 0 ? null : (
                                <ul className="mt-3 space-y-1 border-t border-brand/15 pt-2">
                                    {search.answers.map((match) => (
                                        <li key={match.answer_id}>
                                            <Link
                                                href={match.href}
                                                className="block rounded-lg px-2.5 py-2 transition-colors hover:bg-surface/70"
                                            >
                                                <span className="flex items-start gap-1.5 text-[13px] font-semibold text-ink">
                                                    <ChatsCircle
                                                        size={13}
                                                        className="mt-0.5 shrink-0 text-brand"
                                                        aria-hidden="true"
                                                    />
                                                    {match.question_title}
                                                </span>
                                                <span className="mt-0.5 line-clamp-2 block pl-[19px] text-[12.5px] leading-relaxed text-ink-muted">
                                                    {match.excerpt}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : null}

                    {questions.data.length === 0 ? (
                        <div className="border-b border-line">
                            <EmptyState
                                title={
                                    filtering
                                        ? 'No questions match those filters'
                                        : community
                                          ? 'No community questions yet'
                                          : canAsk
                                            ? 'No questions yet'
                                            : 'Join a class first'
                                }
                                body={
                                    filtering
                                        ? 'Try a different search or class, or go back to the newest questions.'
                                        : community
                                          ? 'Start the community board. Anyone signed in can answer, and photos of your working are welcome.'
                                          : canAsk
                                            ? 'Be the first to ask. A clear title, what you tried and a photo if it helps is enough.'
                                            : 'Questions live inside a class. Join one with the key from your instructor and the board opens here.'
                                }
                                action={
                                    filtering ? (
                                        <Button variant="outline" onClick={reset}>
                                            Clear filters
                                        </Button>
                                    ) : canAsk ? (
                                        <Button variant="primary" onClick={() => setAsking(true)}>
                                            <Plus size={16} weight="bold" aria-hidden="true" />
                                            Ask the first question
                                        </Button>
                                    ) : (
                                        <Link href={classHref} className="btn btn-primary">
                                            {role === 'instructor' ? 'Open your classes' : 'Join a class'}
                                        </Link>
                                    )
                                }
                            />
                        </div>
                    ) : (
                        <ol className="divide-y divide-line border-b border-line">
                            {questions.data.map((question) => (
                                <li
                                    key={question.id}
                                    className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 py-4 transition-colors hover:bg-surface/70 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-4"
                                >
                                    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-end">
                                        <VoteControl
                                            score={question.score}
                                            myVote={question.my_vote}
                                            canVote={question.can_vote}
                                            endpoint={routes.questions.vote(question.id)}
                                            size="sm"
                                        />

                                        <div
                                            className={cn(
                                                'flex min-w-[42px] flex-col items-center rounded-md border px-1.5 py-1 text-center',
                                                question.accepted
                                                    ? 'border-live/30 bg-live-soft text-live'
                                                    : 'border-line bg-surface text-ink-muted',
                                            )}
                                            title={`${question.answers_count} answers`}
                                        >
                                            {question.accepted ? (
                                                <CheckCircle size={12} weight="fill" aria-hidden="true" />
                                            ) : null}
                                            <span className="text-sm font-semibold tabular">
                                                {question.answers_count}
                                            </span>
                                            <span className="text-[9px] font-semibold tracking-wide uppercase">
                                                {question.answers_count === 1 ? 'answer' : 'answers'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                            <h2 className="text-[16px] leading-snug font-semibold sm:text-[17px]">
                                                <Link
                                                    href={question.href}
                                                    className="text-brand transition-colors hover:text-brand-strong hover:underline"
                                                >
                                                    {question.title}
                                                </Link>
                                            </h2>
                                            {question.mine ? <span className="chip chip-brand">Yours</span> : null}
                                            {instructor && question.answers_count === 0 ? (
                                                <span className="chip chip-mentor">Needs reply</span>
                                            ) : null}
                                        </div>

                                        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-muted">
                                            {question.excerpt}
                                        </p>

                                        {question.match_kind === 'answer' && question.match_excerpt ? (
                                            <p className="mt-1.5 flex gap-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                                                <ChatsCircle
                                                    size={12}
                                                    className="mt-0.5 shrink-0 text-brand"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    <span className="font-medium text-ink">Answer match:</span>{' '}
                                                    {question.match_excerpt}
                                                </span>
                                            </p>
                                        ) : null}

                                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                                            {question.tags.map((tag) => (
                                                <span key={tag} className="tag">
                                                    {tag}
                                                </span>
                                            ))}

                                            {question.media_count === 0 ? null : (
                                                <span
                                                    className="meta inline-flex items-center gap-1"
                                                    title={pluralize(question.media_count, 'photo')}
                                                >
                                                    <ImageSquare size={13} aria-hidden="true" />
                                                    {question.media_count}
                                                </span>
                                            )}

                                            <span className="ml-auto flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span
                                                    className={cn(
                                                        'chip',
                                                        question.visibility === 'community'
                                                            ? 'chip-brand'
                                                            : 'chip-neutral',
                                                    )}
                                                >
                                                    {question.visibility === 'community'
                                                        ? 'Community'
                                                        : question.classroom?.name ?? 'Class'}
                                                </span>
                                                <span className="meta">
                                                    asked {question.created_at} by{' '}
                                                    <span className={question.mine ? 'font-semibold text-ink' : ''}>
                                                        {question.mine ? 'you' : question.user.name}
                                                    </span>
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}

                    {questions.data.length > 0 ? (
                        <div className="border-b border-line">
                            <Pagination paginator={questions} />
                        </div>
                    ) : null}
                </section>

                <aside className="hidden flex-col gap-4 xl:flex" aria-label="Question board details">
                    {instructor ? (
                        <div className="rounded-xl border border-mentor/30 bg-mentor-soft/45 p-4">
                            <span className="chip chip-mentor">
                                <ChartBar size={11} weight="bold" aria-hidden="true" />
                                Triage
                            </span>
                            <p className="mt-2 text-sm font-semibold text-ink">Work the queue</p>
                            <p className="meta mt-1 leading-relaxed">
                                Start with threads that have no reply, then accept a clear solution to close the
                                loop.
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-mentor/20 bg-surface/60 px-2.5 py-2">
                                    <span className="block text-lg font-semibold text-ink tabular">
                                        {stats.unanswered}
                                    </span>
                                    <span className="meta">Unanswered</span>
                                </div>
                                <div className="rounded-lg border border-mentor/20 bg-surface/60 px-2.5 py-2">
                                    <span className="block text-lg font-semibold text-ink tabular">
                                        {stats.unaccepted}
                                    </span>
                                    <span className="meta">To accept</span>
                                </div>
                            </div>
                            <Link href={unansweredHref} className="btn btn-outline btn-sm mt-3 w-full justify-center">
                                Open unanswered
                            </Link>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-brand/20 bg-brand-soft/60 p-4">
                            <p className="text-sm font-semibold text-ink">Looking for an answer?</p>
                            <p className="meta mt-1 leading-relaxed">
                                Ask a clear question, show what you have tried, and attach a photo of your working.
                            </p>
                            {canAsk ? (
                                <Button variant="primary" size="sm" className="mt-3" onClick={() => setAsking(true)}>
                                    <Plus size={14} weight="bold" aria-hidden="true" />
                                    Ask a question
                                </Button>
                            ) : (
                                <Link href={classHref} className="btn btn-outline btn-sm mt-3">
                                    Join a class
                                </Link>
                            )}
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-line bg-surface">
                        <div className="border-b border-line bg-surface-sunken px-4 py-2.5">
                            <p className="eyebrow">This board</p>
                        </div>
                        <dl className="divide-y divide-line">
                            <StatRow label="Questions" value={stats.questions} />
                            <StatRow label="Answers" value={stats.answers} />
                            <StatRow label="Solved" value={stats.solved} />
                            <StatRow
                                label={instructor ? 'Needs acceptance' : 'Yours'}
                                value={instructor ? stats.unaccepted : stats.mine}
                            />
                        </dl>
                    </div>

                    {classrooms.length === 0 ? null : (
                        <div className="overflow-hidden rounded-xl border border-line bg-surface">
                            <div className="border-b border-line bg-surface-sunken px-4 py-2.5">
                                <p className="eyebrow">Your classes</p>
                            </div>
                            <ul className="divide-y divide-line">
                                {classrooms.map((option) => (
                                    <li key={option.id}>
                                        <Link
                                            href={`${routes.questions.index}?classroom=${option.id}`}
                                            className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface-sunken"
                                        >
                                            <UsersThree
                                                size={15}
                                                className="mt-0.5 shrink-0 text-ink-soft"
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-[13px] font-medium text-ink">
                                                    {option.name}
                                                </span>
                                                {option.course === null ? null : (
                                                    <span className="block truncate text-[11px] text-ink-muted">
                                                        {option.course}
                                                    </span>
                                                )}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="rounded-xl border border-line p-4">
                        <p className="eyebrow">Asking well</p>
                        <ul className="mt-2.5 flex flex-col gap-2.5 text-[13px] leading-relaxed text-ink-muted">
                            <li className="flex gap-2">
                                <Lightbulb
                                    size={15}
                                    className="mt-0.5 shrink-0 text-brand"
                                    aria-hidden="true"
                                />
                                <span>Say what you tried. It turns “I don’t get it” into a question someone can answer.</span>
                            </li>
                            <li className="flex gap-2">
                                <ChatsCircle
                                    size={15}
                                    className="mt-0.5 shrink-0 text-brand"
                                    aria-hidden="true"
                                />
                                <span>Explain the step, not just the result. A classmate should be able to retry it alone.</span>
                            </li>
                        </ul>
                    </div>
                </aside>
            </div>

            {canAsk ? (
                <AskQuestionModal
                    key={filters.scope}
                    open={asking}
                    scope={filters.scope}
                    classrooms={classrooms}
                    onClose={() => setAsking(false)}
                />
            ) : null}
        </>
    );
}
