import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarCheck,
    Clock,
    Fire,
    Microphone,
    TrendUp,
} from '@phosphor-icons/react';
import EmptyState from '@/components/ui/EmptyState';
import Select from '@/components/ui/Select';
import Stat from '@/components/ui/Stat';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';

interface AttendanceSession {
    id: number;
    classroom: string;
    classroom_id: number;
    when: string;
    duration: string;
    live: boolean;
    href: string;
    class_url: string;
}

interface ClassSummary {
    id: number;
    name: string;
    join_code: string;
    course: string | null;
    sessions: number;
    days: number;
    time_in_class: string;
    last_attended: string;
    last_on: string | null;
}

interface AttendancePageProps {
    filters: { classroom: number | null; days: number };
    summary: {
        sessions: number;
        days: number;
        seconds: number;
        last_on: string | null;
        time_in_class: string;
        streak: number;
    };
    classrooms: ClassSummary[];
    sessions: AttendanceSession[];
}

export default function StudentAttendance({ filters, summary, classrooms, sessions }: AttendancePageProps) {
    const selected = classrooms.find((classroom) => classroom.id === filters.classroom) ?? null;

    function showClass(value: string): void {
        router.get(
            routes.student.attendance,
            value === '' ? {} : { classroom: value },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Attendance" />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="eyebrow">Student</p>
                    <h1 className="page-title mt-1.5">Attendance</h1>
                    <p className="page-sub">
                        Every call you joined, recorded automatically. This is the same register your instructor sees,
                        from your side of the class.
                    </p>
                </div>

                <label className="w-full sm:w-[260px]">
                    <span className="label">Class</span>
                    <Select
                        value={filters.classroom === null ? '' : String(filters.classroom)}
                        onChange={showClass}
                        options={[
                            { value: '', label: 'All classes' },
                            ...classrooms.map((classroom) => ({ value: String(classroom.id), label: classroom.name })),
                        ]}
                    />
                </label>
            </header>

            <section aria-label="Attendance at a glance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Sessions" value={summary.sessions} hint={`in the last ${filters.days} days`} icon={Microphone} />
                <Stat label="Time in class" value={summary.time_in_class} hint="sum of call time" icon={Clock} />
                <Stat label="Days attended" value={summary.days} hint="distinct days with a call" icon={CalendarCheck} />
                <Stat
                    label="Current streak"
                    value={pluralize(summary.streak, 'day')}
                    hint={summary.streak === 0 ? 'Join a class to start one' : 'keep it going'}
                    tone={summary.streak > 0 ? 'live' : 'neutral'}
                    icon={Fire}
                />
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <section className="card" aria-labelledby="history-heading">
                    <div className="card-head">
                        <div>
                            <h2 id="history-heading" className="section-title">
                                {selected === null ? 'All sessions' : selected.name}
                            </h2>
                            <p className="meta mt-0.5">Newest first. The last {filters.days} days are kept here.</p>
                        </div>
                        <span className="chip chip-neutral">{pluralize(sessions.length, 'row')}</span>
                    </div>

                    {sessions.length === 0 ? (
                        <EmptyState
                            title="No sessions yet"
                            body={
                                selected === null
                                    ? 'Join a call in any of your classes and it appears here with its duration.'
                                    : 'You have not joined a call in this class in the current window.'
                            }
                            action={
                                <Link href={routes.student.classrooms} className="btn btn-outline">
                                    Open my classes
                                </Link>
                            }
                        />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="th">When</th>
                                        <th className="th">Class</th>
                                        <th className="th">In class</th>
                                        <th className="th">Status</th>
                                        <th className="th">
                                            <span className="sr-only">Open</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session) => (
                                        <tr key={session.id} className="row-hover">
                                            <td className="td whitespace-nowrap text-ink tabular">{session.when}</td>
                                            <td className="td">
                                                <Link href={session.class_url} className="font-medium text-ink hover:text-brand">
                                                    {session.classroom}
                                                </Link>
                                            </td>
                                            <td className="td tabular">{session.duration}</td>
                                            <td className="td">
                                                {session.live ? (
                                                    <span className="chip chip-live">
                                                        <span className="live-dot" aria-hidden="true" />
                                                        In the call
                                                    </span>
                                                ) : (
                                                    <span className="chip chip-neutral">Completed</span>
                                                )}
                                            </td>
                                            <td className="td text-right">
                                                <Link
                                                    href={session.href}
                                                    className="btn btn-quiet btn-sm"
                                                    aria-label={`Open the call for ${session.classroom}`}
                                                >
                                                    Rejoin
                                                    <ArrowRight size={13} weight="bold" aria-hidden="true" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <aside className="flex flex-col gap-4 lg:sticky lg:top-24" aria-label="Per-class attendance">
                    <section className="card">
                        <div className="card-head">
                            <div>
                                <h2 className="section-title">By class</h2>
                                <p className="meta mt-0.5">Calls and time in the same window.</p>
                            </div>
                            <TrendUp size={18} className="text-ink-soft" aria-hidden="true" />
                        </div>

                        {classrooms.length === 0 ? (
                            <EmptyState
                                title="No classes yet"
                                body="Join a class with its key and your attendance starts here."
                            />
                        ) : (
                            <ul className="divide-y divide-line">
                                {classrooms.map((classroom) => (
                                    <li key={classroom.id} className="px-5 py-3.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <Link
                                                    href={routes.student.classroom(classroom.id)}
                                                    className="block truncate text-sm font-medium text-ink hover:text-brand"
                                                >
                                                    {classroom.name}
                                                </Link>
                                                <p className="mt-0.5 truncate text-xs text-ink-muted">
                                                    {classroom.course ?? 'Class'} · {classroom.last_attended}
                                                </p>
                                            </div>
                                            <span
                                                className={cn(
                                                    'chip shrink-0',
                                                    classroom.id === filters.classroom ? 'chip-brand' : 'chip-neutral',
                                                )}
                                            >
                                                {pluralize(classroom.sessions, 'call')}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-muted tabular">
                                            <span>{classroom.time_in_class}</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{pluralize(classroom.days, 'day')}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <div className="rounded-2xl border border-line bg-surface-sunken/60 p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-ink">
                            <Fire size={16} weight="duotone" className="text-brand" aria-hidden="true" />
                            How the streak works
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                            Every day you are in at least one class call counts. Missing a day resets it — yesterday
                            still counts while today is open, so an evening class keeps the streak alive.
                        </p>
                    </div>
                </aside>
            </div>
        </>
    );
}
