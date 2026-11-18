import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Books, Chalkboard, LockKey, PlayCircle, Plus } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import { routes } from '@/lib/routes';
import { pluralize } from '@/lib/utils';
import type { SharedProps, StudentCourseView } from '@/types';

type AccessFilter = 'all' | 'free' | 'paid';
type CourseSort = 'title' | 'sections' | 'lessons';

function CourseBadge({ course }: { course: StudentCourseView }) {
    if (course.owned) {
        return <span className="chip chip-mentor">Your course</span>;
    }

    if (course.enrolled) {
        return <span className="chip chip-live">Enrolled</span>;
    }

    return course.is_paid ? (
        <span className="chip chip-neutral">
            <LockKey size={12} aria-hidden="true" />
            {course.price_label ?? 'Paid'}
        </span>
    ) : (
        <span className="chip chip-neutral">Free</span>
    );
}

export default function StudentCourses({
    explore,
    mine,
}: {
    explore: StudentCourseView[];
    mine: StudentCourseView[];
}) {
    const user = usePage<SharedProps>().props.auth.user;
    const [query, setQuery] = useState('');
    const [access, setAccess] = useState<AccessFilter>('all');
    const [sort, setSort] = useState<CourseSort>('title');

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        const matching = explore.filter((course) => {
            if (access === 'free' && course.is_paid) {
                return false;
            }

            if (access === 'paid' && ! course.is_paid) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            const haystack = `${course.title} ${course.description ?? ''} ${course.instructor ?? ''}`.toLowerCase();

            return haystack.includes(needle);
        });

        return [...matching].sort((left, right) => {
            if (sort === 'sections') {
                return right.sections_count - left.sections_count || left.title.localeCompare(right.title);
            }

            if (sort === 'lessons') {
                return right.lessons_count - left.lessons_count || left.title.localeCompare(right.title);
            }

            return left.title.localeCompare(right.title);
        });
    }, [access, explore, query, sort]);

    const filtering = query.trim() !== '' || access !== 'all';

    function reset(): void {
        setQuery('');
        setAccess('all');
        setSort('title');
    }

    return (
        <>
            <Head title="Courses" />

            <header>
                <p className="eyebrow">Community · Learning</p>
                <h1 className="page-title mt-1.5">Courses</h1>
                <p className="page-sub max-w-[72ch]">
                    Your courses are up first with their progress. The rest of the catalogue is below — free and paid courses
                    you have not joined yet.
                </p>
            </header>

            <section aria-labelledby="my-courses-heading" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 id="my-courses-heading" className="section-title">Your courses</h2>
                        <p className="meta mt-0.5">
                            {mine.length === 0
                                ? 'Courses you teach or study will appear here.'
                                : `${pluralize(mine.length, 'course')} you teach or study`}
                        </p>
                    </div>
                    {user?.role === 'instructor' ? (
                        <Link href={routes.instructor.courses} className="btn btn-primary btn-sm">
                            <Plus size={14} weight="bold" aria-hidden="true" />
                            Manage courses
                        </Link>
                    ) : null}
                </div>

                {mine.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            title="No courses of your own yet"
                            body="Join a class with its key to study a course, or create one from the teaching dashboard."
                            action={
                                <Link href={routes.student.classrooms} className="btn btn-tonal btn-sm">
                                    <Chalkboard size={15} aria-hidden="true" />
                                    Go to my classes
                                </Link>
                            }
                        />
                    </div>
                ) : (
                    <div
                        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pt-1 pb-3"
                        aria-label="Your courses, scroll horizontally"
                    >
                        {mine.map((course) => (
                            <article
                                key={course.id}
                                className="card group flex w-[268px] shrink-0 snap-start flex-col overflow-hidden transition hover:border-line-strong"
                            >
                                <Link
                                    href={course.url}
                                    className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-mentor/25 via-brand-soft to-surface-sunken"
                                    aria-label={course.title}
                                >
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface/80 text-mentor shadow-card">
                                        <Books size={24} aria-hidden="true" />
                                    </span>
                                    <span className="absolute top-2 left-2">
                                        <CourseBadge course={course} />
                                    </span>
                                    <span className="absolute right-2 bottom-2 rounded-md bg-surface/85 px-2 py-0.5 text-[10.5px] font-medium text-ink">
                                        {pluralize(course.lessons_count, 'lesson')}
                                    </span>
                                </Link>

                                <div className="flex flex-1 flex-col gap-2 p-3.5">
                                    <Link
                                        href={course.url}
                                        className="line-clamp-2 text-[14px] leading-snug font-semibold text-ink group-hover:text-brand"
                                    >
                                        {course.title}
                                    </Link>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted">
                                        <span>{course.owned ? 'Teaching' : course.instructor ?? 'Instructor'}</span>
                                        <span>{pluralize(course.sections_count, 'section')}</span>
                                        {course.price_label ? <span>{course.price_label}</span> : null}
                                    </div>

                                    <div className="mt-auto pt-1">
                                        <div className="flex items-center justify-between text-[11px] text-ink-muted">
                                            <span>{course.owned ? 'Published lessons' : 'Your progress'}</span>
                                            <span className="tabular">{course.progress.percent}%</span>
                                        </div>
                                        <div
                                            className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                                            role="progressbar"
                                            aria-label={`${course.title} progress`}
                                            aria-valuenow={course.progress.percent}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        >
                                            <div className="h-full rounded-full bg-mentor" style={{ width: `${course.progress.percent}%` }} />
                                        </div>
                                    </div>

                                    <Link href={course.continue_url ?? course.url} className="btn btn-primary btn-sm mt-1 w-full justify-center">
                                        <PlayCircle size={14} aria-hidden="true" />
                                        {course.owned ? 'Open course' : course.progress.completed > 0 ? 'Continue' : 'Start'}
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section aria-labelledby="explore-heading" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 id="explore-heading" className="section-title">Explore courses</h2>
                        <p className="meta mt-0.5">New courses to discover — courses you teach or study are not listed here.</p>
                    </div>
                    {filtering ? (
                        <p className="meta">Showing {visible.length} of {explore.length} courses</p>
                    ) : null}
                </div>

                <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                    <SearchInput
                        className="flex-1"
                        label="Search"
                        value={query}
                        onChange={setQuery}
                        placeholder="Course, teacher or topic"
                        ariaLabel="Search courses"
                    />

                    <label className="sm:w-[170px]">
                        <span className="label">Access</span>
                        <Select
                            value={access}
                            onChange={(value) => setAccess(value as AccessFilter)}
                            options={[
                                { value: 'all', label: 'All courses' },
                                { value: 'free', label: 'Free' },
                                { value: 'paid', label: 'Paid' },
                            ]}
                        />
                    </label>

                    <label className="sm:w-[190px]">
                        <span className="label">Sort by</span>
                        <Select
                            value={sort}
                            onChange={(value) => setSort(value as CourseSort)}
                            options={[
                                { value: 'title', label: 'Title' },
                                { value: 'sections', label: 'Most sections' },
                                { value: 'lessons', label: 'Most lessons' },
                            ]}
                        />
                    </label>

                    {filtering ? (
                        <Button type="button" variant="quiet" onClick={reset}>
                            Reset
                        </Button>
                    ) : null}
                </div>

                {visible.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            title={explore.length === 0 ? 'No more courses yet' : 'No courses match'}
                            body={explore.length === 0
                                ? 'You have seen every published course. New courses will show up here.'
                                : 'Try another word, or clear the filter to see the whole catalogue.'}
                            action={
                                explore.length > 0 ? (
                                    <Button variant="outline" onClick={reset}>
                                        Clear filters
                                    </Button>
                                ) : undefined
                            }
                        />
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {visible.map((course) => (
                            <Link
                                key={course.id}
                                href={course.url}
                                className="card group flex flex-col p-4 transition hover:border-line-strong"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                                        <Books size={18} aria-hidden="true" />
                                    </span>
                                    <CourseBadge course={course} />
                                </div>

                                <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.01em] group-hover:text-brand">
                                    {course.title}
                                </h3>
                                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                                    {course.description ?? 'No description yet.'}
                                </p>

                                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                                    <div>
                                        <p className="meta">{course.instructor ?? 'Instructor'}</p>
                                        <p className="meta mt-0.5">
                                            {pluralize(course.sections_count, 'section')} ·{' '}
                                            {pluralize(course.lessons_count, 'lesson')}
                                        </p>
                                    </div>
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-sunken text-ink-muted transition group-hover:bg-brand group-hover:text-white">
                                        <ArrowRight size={14} aria-hidden="true" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
