import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Broadcast,
    CalendarCheck,
    GraduationCap,
    MagnifyingGlass,
    Student as StudentIcon,
    Users,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Select from '@/components/ui/Select';
import Stat from '@/components/ui/Stat';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';

interface StudentRow {
    id: number;
    name: string;
    email: string;
    initials: string;
    classes: Array<{ id: number; name: string; url: string }>;
    sessions: number;
    days: number;
    time_in_class: string;
    last_seen: string;
    present: boolean;
    attended_today: boolean;
}

interface StudentsPageProps {
    filters: { q: string; classroom: number | null };
    stats: { students: number; seats: number; in_call: number; active_week: number };
    classrooms: Array<{ id: number; name: string; members: number }>;
    students: StudentRow[];
}

export default function InstructorStudents({ filters, stats, classrooms, students }: StudentsPageProps) {
    const [q, setQ] = useState(filters.q);
    const selected = classrooms.find((classroom) => classroom.id === filters.classroom) ?? null;

    function navigate(overrides: { q?: string; classroom?: string } = {}): void {
        const nextQ = overrides.q ?? q;
        const nextClassroom = overrides.classroom ?? (filters.classroom === null ? '' : String(filters.classroom));

        router.get(
            routes.instructor.students,
            {
                q: nextQ.trim() === '' ? undefined : nextQ.trim(),
                classroom: nextClassroom === '' ? undefined : nextClassroom,
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
        router.get(routes.instructor.students, {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    const filtering = filters.q !== '' || filters.classroom !== null;

    return (
        <>
            <Head title="Students" />

            <header>
                <p className="eyebrow">Instructor</p>
                <h1 className="page-title mt-1.5">Students</h1>
                <p className="page-sub">
                    Everyone enrolled across your classes, with the calls they joined in the last month. Search a name
                    or narrow the list to one class.
                </p>
            </header>

            <section aria-label="Students at a glance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Students" value={stats.students} hint="distinct people you teach" icon={StudentIcon} />
                <Stat label="Seats" value={stats.seats} hint="memberships across classes" icon={GraduationCap} />
                <Stat
                    label="In call now"
                    value={stats.in_call}
                    hint={stats.in_call === 0 ? 'No students in a room' : 'students in a live room'}
                    tone={stats.in_call > 0 ? 'live' : 'neutral'}
                    icon={Broadcast}
                />
                <Stat label="Active this week" value={stats.active_week} hint="attended at least one call" icon={CalendarCheck} />
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
                            placeholder="Name or email"
                            aria-label="Search students"
                        />
                    </span>
                </label>

                <label className="sm:w-[260px]">
                    <span className="label">Class</span>
                    <Select
                        value={filters.classroom === null ? '' : String(filters.classroom)}
                        onChange={(next) => navigate({ classroom: next })}
                        options={[
                            { value: '', label: 'All classes' },
                            ...classrooms.map((classroom) => ({ value: String(classroom.id), label: classroom.name })),
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

            <section className="card" aria-labelledby="students-heading">
                <div className="card-head">
                    <div>
                        <h2 id="students-heading" className="section-title">
                            {selected === null ? 'All students' : selected.name}
                        </h2>
                        <p className="meta mt-0.5">
                            {pluralize(students.length, 'student')}
                            {selected === null ? ' across your classes' : ` in ${selected.name}`}.
                        </p>
                    </div>
                    <span className="chip chip-neutral">
                        <Users size={13} aria-hidden="true" />
                        {filtering ? 'Filtered' : 'Everyone'}
                    </span>
                </div>

                {students.length === 0 ? (
                    <EmptyState
                        title={filtering ? 'No students match' : 'No students yet'}
                        body={
                            filtering
                                ? 'Try another search, or clear the class filter.'
                                : 'Students appear here as soon as they join one of your classes with its key.'
                        }
                        action={
                            filtering ? (
                                <Button variant="outline" onClick={reset}>
                                    Clear filters
                                </Button>
                            ) : (
                                <Link href={routes.instructor.classrooms} className="btn btn-outline">
                                    Share a class key
                                </Link>
                            )
                        }
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="th">Student</th>
                                    <th className="th">Classes</th>
                                    <th className="th">Sessions</th>
                                    <th className="th">In class</th>
                                    <th className="th">Last seen</th>
                                    <th className="th">Today</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="row-hover">
                                        <td className="td">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={student.name} size="sm" tone="neutral" />
                                                <div className="min-w-0">
                                                    <span className="block truncate font-medium text-ink">
                                                        {student.name}
                                                    </span>
                                                    <span className="block truncate text-xs text-ink-soft">
                                                        {student.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="td">
                                            <div className="flex max-w-[260px] flex-wrap gap-1.5">
                                                {student.classes.map((classroom) => (
                                                    <Link
                                                        key={classroom.id}
                                                        href={classroom.url}
                                                        className="chip bg-surface-sunken text-ink-muted transition hover:bg-brand-soft hover:text-brand"
                                                    >
                                                        {classroom.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="td tabular">{student.sessions}</td>
                                        <td className="td tabular">{student.time_in_class}</td>
                                        <td className="td whitespace-nowrap">{student.last_seen}</td>
                                        <td className="td">
                                            <span
                                                className={cn(
                                                    'chip',
                                                    student.present
                                                        ? 'chip-live'
                                                        : student.attended_today
                                                          ? 'chip-brand'
                                                          : 'chip-neutral',
                                                )}
                                            >
                                                {student.present ? (
                                                    <>
                                                        <span className="live-dot" aria-hidden="true" />
                                                        In call
                                                    </>
                                                ) : student.attended_today ? (
                                                    'Attended today'
                                                ) : (
                                                    'Not yet'
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <span>Sessions and time cover the last 30 days. “In call” uses the same heartbeat as the register.</span>
                <Link href={routes.instructor.attendance} className="btn btn-quiet btn-sm">
                    Attendance overview
                    <ArrowRight size={13} weight="bold" aria-hidden="true" />
                </Link>
            </div>
        </>
    );
}
