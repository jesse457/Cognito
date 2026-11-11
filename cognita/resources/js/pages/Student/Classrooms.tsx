import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Broadcast,
    CalendarCheck,
    ChalkboardTeacher,
    FilePdf,
    MagnifyingGlass,
    Microphone,
    Users,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import KeyChip from '@/components/ui/KeyChip';
import Select from '@/components/ui/Select';
import Stat from '@/components/ui/Stat';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';

interface ClassroomCard {
    id: number;
    name: string;
    join_code: string;
    course: string | null;
    instructor: string | null;
    members: number;
    live: boolean;
    last_attended: string;
    sessions: number;
    time_in_class: string;
    days: number;
    materials: number;
    call_url: string;
    class_url: string;
}

interface ClassroomsPageProps {
    filters: { q: string; course: number | null; live: boolean };
    stats: { classes: number; courses: number; live: number; materials: number };
    courses: Array<{ id: number; title: string; classes: number }>;
    classrooms: ClassroomCard[];
}

export default function StudentClassrooms({ filters, stats, courses, classrooms }: ClassroomsPageProps) {
    const [q, setQ] = useState(filters.q);
    const [course, setCourse] = useState(filters.course === null ? '' : String(filters.course));
    const [live, setLive] = useState(filters.live);

    function navigate(overrides: { q?: string; course?: string; live?: boolean } = {}): void {
        const nextQ = overrides.q ?? q;
        const nextCourse = overrides.course ?? course;
        const nextLive = overrides.live ?? live;

        router.get(
            routes.student.classrooms,
            {
                q: nextQ.trim() === '' ? undefined : nextQ.trim(),
                course: nextCourse === '' ? undefined : nextCourse,
                live: nextLive ? 1 : undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function submit(event: FormEvent): void {
        event.preventDefault();
        navigate();
    }

    function reset(): void {
        setQ('');
        setCourse('');
        setLive(false);
        router.get(routes.student.classrooms, {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    const filtering = filters.q !== '' || filters.course !== null || filters.live;

    return (
        <>
            <Head title="My classes" />

            <header>
                <p className="eyebrow">Student</p>
                <h1 className="page-title mt-1.5">My classes</h1>
                <p className="page-sub">
                    Search the classes you joined with a key, open one for its attendance and materials, or jump
                    straight into a live room.
                </p>
            </header>

            <section aria-label="Classes at a glance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Classes" value={stats.classes} hint="joined with a key" icon={ChalkboardTeacher} />
                <Stat
                    label="Live now"
                    value={stats.live}
                    hint={stats.live === 0 ? 'No room is open' : 'rooms you can join'}
                    tone={stats.live > 0 ? 'live' : 'neutral'}
                    icon={Broadcast}
                />
                <Stat label="Courses" value={stats.courses} hint="your classes are grouped into" icon={Users} />
                <Stat label="Materials" value={stats.materials} hint="PDFs shared in your classes" icon={FilePdf} />
            </section>

            <form onSubmit={submit} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                <label className="flex-1">
                    <span className="label">Search</span>
                    <span className="relative block">
                        <MagnifyingGlass
                            size={16}
                            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft"
                            aria-hidden="true"
                        />
                        <input
                            value={q}
                            onChange={(event) => setQ(event.target.value)}
                            className="input pl-10"
                            placeholder="Class, course, instructor or key"
                            aria-label="Search classes"
                        />
                    </span>
                </label>

                <label className="sm:w-[220px]">
                    <span className="label">Course</span>
                    <Select
                        value={course}
                        onChange={(next) => {
                            setCourse(next);
                            navigate({ course: next });
                        }}
                        options={[
                            { value: '', label: 'All courses' },
                            ...courses.map((option) => ({ value: String(option.id), label: option.title })),
                        ]}
                    />
                </label>

                <label className="flex h-[42px] cursor-pointer items-center gap-2.5 rounded-xl border border-line-strong bg-surface px-3.5 text-sm">
                    <input
                        type="checkbox"
                        checked={live}
                        onChange={(event) => {
                            setLive(event.target.checked);
                            navigate({ live: event.target.checked });
                        }}
                        className="h-4 w-4 rounded border-line-strong text-brand focus:ring-brand"
                    />
                    <span className="whitespace-nowrap">Live only</span>
                </label>

                <div className="flex gap-2">
                    <Button type="submit" variant="primary">
                        Search
                    </Button>
                    {filtering ? (
                        <Button type="button" variant="quiet" onClick={reset}>
                            Reset
                        </Button>
                    ) : null}
                </div>
            </form>

            <section aria-labelledby="class-list-heading" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="class-list-heading" className="section-title">
                        {filtering ? `${pluralize(classrooms.length, 'match', 'matches')}` : 'All your classes'}
                    </h2>
                    <p className="meta">Each class is one group call and one board.</p>
                </div>

                {classrooms.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            title={filtering ? 'No classes match those filters' : 'No classes yet'}
                            body={
                                filtering
                                    ? 'Try a different search, course or turn off the live filter.'
                                    : 'The key from your instructor is all you need. Type it on the overview page and the class appears here.'
                            }
                            action={
                                filtering ? (
                                    <Button variant="outline" onClick={reset}>
                                        Clear filters
                                    </Button>
                                ) : (
                                    <Link href={routes.student.home} className="btn btn-primary">
                                        Join a class
                                    </Link>
                                )
                            }
                        />
                    </div>
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2">
                        {classrooms.map((classroom) => (
                            <li
                                key={classroom.id}
                                className={cn(
                                    'card flex flex-col gap-4 p-5 transition hover:border-line-strong',
                                    classroom.live && 'border-live/40',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="eyebrow truncate">{classroom.course ?? 'Class'}</p>
                                        <h3 className="mt-1.5 truncate text-[15px] font-semibold">
                                            <Link href={classroom.class_url} className="hover:text-brand">
                                                {classroom.name}
                                            </Link>
                                        </h3>
                                        <p className="meta mt-1 truncate">
                                            {classroom.instructor ?? 'Instructor'} ·{' '}
                                            {pluralize(classroom.members, 'member')}
                                        </p>
                                    </div>

                                    {classroom.live ? (
                                        <span className="chip chip-live shrink-0">
                                            <span className="live-dot" aria-hidden="true" />
                                            Live
                                        </span>
                                    ) : null}
                                </div>

                                <dl className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface-sunken/60 p-3 text-center">
                                    <div>
                                        <dt className="text-[10px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
                                            Sessions
                                        </dt>
                                        <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
                                            {classroom.sessions}
                                        </dd>
                                    </div>
                                    <div className="border-x border-line">
                                        <dt className="text-[10px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
                                            In class
                                        </dt>
                                        <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
                                            {classroom.time_in_class}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
                                            Materials
                                        </dt>
                                        <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
                                            {classroom.materials}
                                        </dd>
                                    </div>
                                </dl>

                                <p className="meta flex items-center gap-1.5">
                                    <CalendarCheck size={13} aria-hidden="true" />
                                    {classroom.last_attended}
                                </p>

                                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                                    <KeyChip code={classroom.join_code} compact />
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={classroom.class_url} className="btn btn-outline btn-sm">
                                            Open class
                                            <ArrowRight size={13} weight="bold" aria-hidden="true" />
                                        </Link>
                                        <Link
                                            href={classroom.call_url}
                                            className={cn('btn btn-sm', classroom.live ? 'btn-primary' : 'btn-quiet')}
                                        >
                                            <Microphone size={15} weight="duotone" aria-hidden="true" />
                                            {classroom.live ? 'Join call' : 'Open call'}
                                        </Link>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}
