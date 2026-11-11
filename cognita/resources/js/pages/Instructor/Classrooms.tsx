import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Broadcast,
    CalendarCheck,
    ChalkboardTeacher,
    ClockCounterClockwise,
    FilePdf,
    MagnifyingGlass,
    Microphone,
    Plus,
    Users,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import NewClassModal from '@/components/instructor/NewClassModal';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import KeyChip from '@/components/ui/KeyChip';
import Select from '@/components/ui/Select';
import Stat from '@/components/ui/Stat';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';

interface TeachingClassCard {
    id: number;
    name: string;
    join_code: string;
    course: string | null;
    members: number;
    materials: number;
    live: boolean;
    in_call: number;
    last_session: string;
    call_url: string;
    class_url: string;
    attendance_url: string;
}

interface ClassroomsPageProps {
    filters: { q: string; course: number | null; status: 'all' | 'live' | 'idle' };
    stats: { classes: number; students: number; live: number; unassigned: number };
    courses: Array<{ id: number; title: string; classes: number }>;
    classrooms: TeachingClassCard[];
}

export default function InstructorClassrooms({ filters, stats, courses, classrooms }: ClassroomsPageProps) {
    const [creating, setCreating] = useState(false);
    const [q, setQ] = useState(filters.q);
    const [course, setCourse] = useState(filters.course === null ? '' : String(filters.course));
    const [status, setStatus] = useState(filters.status);

    function navigate(overrides: { q?: string; course?: string; status?: string } = {}): void {
        const nextQ = overrides.q ?? q;
        const nextCourse = overrides.course ?? course;
        const nextStatus = overrides.status ?? status;

        router.get(
            routes.instructor.classrooms,
            {
                q: nextQ.trim() === '' ? undefined : nextQ.trim(),
                course: nextCourse === '' ? undefined : nextCourse,
                status: nextStatus === 'all' ? undefined : nextStatus,
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
        setStatus('all');
        router.get(routes.instructor.classrooms, {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    const filtering = filters.q !== '' || filters.course !== null || filters.status !== 'all';

    return (
        <>
            <Head title="Classes" />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="eyebrow">Instructor</p>
                    <h1 className="page-title mt-1.5">Classes</h1>
                    <p className="page-sub">
                        Every room you teach. Open one to see the roster, the key, the board and the register; start a
                        new one whenever you need another group.
                    </p>
                </div>
                <Button variant="primary" onClick={() => setCreating(true)}>
                    <Plus size={16} weight="bold" aria-hidden="true" />
                    New class
                </Button>
            </header>

            <section aria-label="Classes at a glance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Classes" value={stats.classes} hint="each owns one call and board" icon={ChalkboardTeacher} />
                <Stat label="Students" value={stats.students} hint="enrolled across your classes" icon={Users} />
                <Stat
                    label="Live now"
                    value={stats.live}
                    hint={stats.live === 0 ? 'No rooms are open' : 'rooms with people in them'}
                    tone={stats.live > 0 ? 'live' : 'neutral'}
                    icon={Broadcast}
                />
                <Stat
                    label="No course"
                    value={stats.unassigned}
                    hint={stats.unassigned === 0 ? 'All classes are grouped' : 'classes without a course'}
                    icon={ClockCounterClockwise}
                />
            </section>

            <form onSubmit={submit} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
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
                            placeholder="Class name, course or key"
                            aria-label="Search classes"
                        />
                    </span>
                </label>

                <label className="lg:w-[220px]">
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

                <label className="lg:w-[170px]">
                    <span className="label">Status</span>
                    <Select
                        value={status}
                        onChange={(next) => {
                            setStatus(next as 'all' | 'live' | 'idle');
                            navigate({ status: next });
                        }}
                        options={[
                            { value: 'all', label: 'All classes' },
                            { value: 'live', label: 'Live now' },
                            { value: 'idle', label: 'Not live' },
                        ]}
                    />
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
                        {filtering ? pluralize(classrooms.length, 'match', 'matches') : 'All classes'}
                    </h2>
                    <p className="meta">
                        {pluralize(stats.students, 'student')} · {pluralize(stats.classes, 'class', 'classes')}
                    </p>
                </div>

                {classrooms.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            title={filtering ? 'No classes match those filters' : 'No classes yet'}
                            body={
                                filtering
                                    ? 'Try another search, course or status.'
                                    : 'A class gets a key the moment you create it. Students type that key to join the room, and the board is already attached.'
                            }
                            action={
                                filtering ? (
                                    <Button variant="outline" onClick={reset}>
                                        Clear filters
                                    </Button>
                                ) : (
                                    <Button variant="primary" onClick={() => setCreating(true)}>
                                        <Plus size={16} weight="bold" aria-hidden="true" />
                                        Create your first class
                                    </Button>
                                )
                            }
                        />
                    </div>
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {classrooms.map((classroom) => (
                            <li
                                key={classroom.id}
                                className={cn(
                                    'card flex flex-col gap-3.5 p-5 transition hover:border-line-strong',
                                    classroom.live && 'border-live/40',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="eyebrow truncate">
                                            {classroom.course ?? 'Unassigned course'}
                                        </p>
                                        <h3 className="mt-1.5 truncate text-[15px] font-semibold">
                                            <Link href={classroom.class_url} className="hover:text-brand">
                                                {classroom.name}
                                            </Link>
                                        </h3>
                                    </div>
                                    {classroom.live ? (
                                        <span className="chip chip-live shrink-0">
                                            <span className="live-dot" aria-hidden="true" />
                                            Live
                                        </span>
                                    ) : (
                                        <span className="chip chip-neutral shrink-0">
                                            <Users size={13} aria-hidden="true" />
                                            {classroom.members}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <p className="meta flex items-center gap-1.5">
                                        <Users size={13} aria-hidden="true" />
                                        {pluralize(classroom.members, 'student')}
                                        {classroom.in_call > 0
                                            ? ` · ${pluralize(classroom.in_call, 'student')} in the call`
                                            : ''}
                                    </p>
                                    <p className="meta flex items-center gap-1.5">
                                        <FilePdf size={13} aria-hidden="true" />
                                        {pluralize(classroom.materials, 'file')} in the class library
                                    </p>
                                    <p className="meta flex items-center gap-1.5">
                                        <ClockCounterClockwise size={13} aria-hidden="true" />
                                        {classroom.last_session}
                                    </p>
                                </div>

                                <KeyChip code={classroom.join_code} compact />

                                <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3.5">
                                    <Link href={classroom.call_url} className="btn btn-primary btn-sm">
                                        <Microphone size={15} weight="duotone" aria-hidden="true" />
                                        {classroom.live ? 'Join call' : 'Start call'}
                                    </Link>
                                    <Link href={classroom.attendance_url} className="btn btn-quiet btn-sm">
                                        <CalendarCheck size={14} weight="duotone" aria-hidden="true" />
                                        Register
                                    </Link>
                                    <Link href={classroom.class_url} className="btn btn-quiet btn-sm">
                                        Details
                                        <ArrowRight size={13} weight="bold" aria-hidden="true" />
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <NewClassModal open={creating} courses={courses} onClose={() => setCreating(false)} />
        </>
    );
}
