import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CalendarBlank, DownloadSimple, FilePdf, Microphone, Users } from '@phosphor-icons/react';
import EmptyState from '@/components/ui/EmptyState';
import KeyChip from '@/components/ui/KeyChip';
import { Field, TextInput } from '@/components/ui/Field';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';

interface AttendanceRow {
    id: number;
    name: string;
    email: string;
    status: string;
    first_joined: string;
    last_seen: string;
    sessions: number;
    duration_seconds: number;
    duration: string;
}

interface AttendancePageProps {
    classroom: {
        id: number;
        name: string;
        join_code: string;
        course: string | null;
        classUrl: string;
        callUrl: string;
    };
    report: {
        date: string;
        date_label: string;
        present: number;
        absent: number;
        total: number;
        rows: AttendanceRow[];
        exports: { xlsx: string; pdf: string };
    };
    today: string;
}

/**
 * The register: one row per enrolled student for one day.
 *
 * Attendance is automatic — it starts when a student's call token is issued and
 * ends when they leave — so this page has nothing to save. Its whole job is to
 * show the day, let you look at another one, and hand out the two files an
 * office will ask for.
 */
export default function InstructorAttendance({ classroom, report, today }: AttendancePageProps) {
    function showDate(date: string): void {
        if (date === '') {
            return;
        }

        router.get(
            routes.instructor.classroomAttendance(classroom.id, date),
            {},
            { preserveState: true, preserveScroll: true },
        );
    }

    return (
        <>
            <Head title={`Attendance · ${classroom.name}`} />

            <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                <Link href={classroom.classUrl} className="btn btn-quiet btn-sm">
                    <ArrowLeft size={14} aria-hidden="true" />
                    {classroom.name}
                </Link>
                <span className="text-ink-soft">/</span>
                <span className="font-medium text-ink">Attendance</span>
            </nav>

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="eyebrow">{classroom.course ?? 'Unassigned course'}</p>
                    <h1 className="page-title mt-1.5">Attendance</h1>
                    <p className="page-sub">
                        Recorded automatically while students are in the call. {report.date_label}.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                            Class key
                            <KeyChip code={classroom.join_code} compact />
                        </span>
                        <span className="chip chip-neutral">
                            <Users size={13} aria-hidden="true" />
                            {pluralize(report.total, 'student')}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <a href={report.exports.xlsx} className="btn btn-outline">
                        <DownloadSimple size={16} aria-hidden="true" />
                        Excel
                    </a>
                    <a href={report.exports.pdf} className="btn btn-outline">
                        <FilePdf size={16} aria-hidden="true" />
                        PDF
                    </a>
                    <Link href={classroom.callUrl} className="btn btn-primary">
                        <Microphone size={16} weight="duotone" aria-hidden="true" />
                        Open the call
                    </Link>
                </div>
            </header>

            <section className="mt-6 grid gap-3 lg:grid-cols-[280px_1fr]" aria-label="Attendance for one day">
                <div className="card h-fit p-5">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="section-title">Day</h2>
                        <CalendarBlank size={20} className="text-ink-soft" aria-hidden="true" />
                    </div>

                    <div className="mt-3">
                        <Field label="Attendance date">
                            {(id) => (
                                <TextInput
                                    id={id}
                                    type="date"
                                    max={today}
                                    value={report.date}
                                    onChange={(event) => showDate(event.target.value)}
                                />
                            )}
                        </Field>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-line bg-surface-sunken/60 p-3">
                            <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-soft uppercase">Present</p>
                            <p className="mt-0.5 text-xl font-semibold text-ink tabular">{report.present}</p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface-sunken/60 p-3">
                            <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-soft uppercase">Absent</p>
                            <p className="mt-0.5 text-xl font-semibold text-ink tabular">{report.absent}</p>
                        </div>
                    </div>

                    <p className="hint">
                        A student counts as present once they have been in the call that day. Nobody is marked by
                        hand, and nothing here can be edited — the report follows the call.
                    </p>
                </div>

                <div className="card">
                    <div className="card-head">
                        <div>
                            <h2 className="section-title">{report.date_label}</h2>
                            <p className="meta mt-0.5">
                                {pluralize(report.present, 'student')} attended, {pluralize(report.absent, 'student')}{' '}
                                missing.
                            </p>
                        </div>
                        <span
                            className={cn(
                                'chip',
                                report.total > 0 && report.present > 0 ? 'chip-live' : 'chip-neutral',
                            )}
                        >
                            {report.total > 0 ? `${report.present}/${report.total}` : 'No students'}
                        </span>
                    </div>

                    {report.total === 0 ? (
                        <EmptyState
                            title="Nobody is enrolled yet"
                            body="Students appear here as soon as they join the class with its key."
                            action={
                                <Link href={classroom.classUrl} className="btn btn-outline">
                                    Back to the class
                                </Link>
                            }
                        />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="th">Student</th>
                                        <th className="th">Status</th>
                                        <th className="th">First joined</th>
                                        <th className="th">Last seen</th>
                                        <th className="th">Sessions</th>
                                        <th className="th">In class</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.rows.map((row) => {
                                        const present = row.status === 'Present';

                                        return (
                                            <tr key={row.id} className="row-hover">
                                                <td className="td">
                                                    <span className="block font-medium text-ink">{row.name}</span>
                                                    <span className="block text-xs text-ink-soft">{row.email}</span>
                                                </td>
                                                <td className="td">
                                                    <span className={cn('chip', present ? 'chip-live' : 'chip-neutral')}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="td tabular">{row.first_joined}</td>
                                                <td className="td tabular">{row.last_seen}</td>
                                                <td className="td tabular">{row.sessions}</td>
                                                <td className="td tabular">{row.duration}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
