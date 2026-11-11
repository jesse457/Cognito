import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarCheck,
    ChartBar,
    Microphone,
    Percent,
    Users,
} from '@phosphor-icons/react';
import EmptyState from '@/components/ui/EmptyState';
import { Field, TextInput } from '@/components/ui/Field';
import Stat from '@/components/ui/Stat';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';

interface AttendanceRow {
    id: number;
    name: string;
    course: string | null;
    members: number;
    present: number;
    absent: number;
    rate: number | null;
    live: boolean;
    class_url: string;
    attendance_url: string;
    call_url: string;
}

interface TrendDay {
    date: string;
    label: string;
    day: string;
    present: number;
    total: number;
    rate: number | null;
}

interface AttendanceOverviewProps {
    filters: { date: string };
    stats: { classes: number; students: number; present: number; absent: number; rate: number | null };
    report: {
        date: string;
        date_label: string;
        today: string;
        rows: AttendanceRow[];
        trend: TrendDay[];
    };
}

function rateTone(rate: number | null): string {
    if (rate === null) return 'chip-neutral';
    if (rate >= 75) return 'chip-live';
    if (rate >= 40) return 'chip-warn';
    return 'chip-danger';
}

export default function InstructorAttendanceOverview({ filters, stats, report }: AttendanceOverviewProps) {
    function showDate(date: string): void {
        if (date === '') {
            return;
        }

        router.get(
            routes.instructor.attendance,
            date === report.today ? {} : { date },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Attendance" />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="eyebrow">Instructor</p>
                    <h1 className="page-title mt-1.5">Attendance</h1>
                    <p className="page-sub">
                        Who turned up across every class on {report.date_label.toLowerCase()}. Open a class register
                        for names, first joined, time in class and the downloads.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    <div className="w-[190px]">
                        <Field label="Day" htmlFor="attendance-overview-date">
                            {(id) => (
                                <TextInput
                                    id={id}
                                    type="date"
                                    max={report.today}
                                    value={filters.date}
                                    onChange={(event) => showDate(event.target.value)}
                                />
                            )}
                        </Field>
                    </div>
                    <Link
                        href={routes.instructor.attendance}
                        className={cn('btn btn-outline', filters.date === report.today && 'btn-tonal')}
                    >
                        Today
                    </Link>
                </div>
            </header>

            <section aria-label="Attendance at a glance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                    label="Present"
                    value={stats.present}
                    hint={`of ${pluralize(stats.students, 'student')} enrolled`}
                    tone={stats.present > 0 ? 'live' : 'neutral'}
                    icon={Users}
                />
                <Stat label="Absent" value={stats.absent} hint="enrolled but not in a call" icon={CalendarCheck} />
                <Stat
                    label="Attendance rate"
                    value={stats.rate === null ? '—' : `${stats.rate}%`}
                    hint={stats.students === 0 ? 'No enrollments yet' : 'present ÷ enrolled, for the day'}
                    icon={Percent}
                />
                <Stat label="Classes" value={stats.classes} hint="sittings covered by this report" icon={ChartBar} />
            </section>

            <section className="card p-5" aria-labelledby="trend-heading">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 id="trend-heading" className="section-title">
                            Seven-day trend
                        </h2>
                        <p className="meta mt-0.5">
                            Distinct students in a call each day, ending {report.date_label}.
                        </p>
                    </div>
                    <span className="chip chip-neutral">unique students</span>
                </div>

                <div className="mt-5 flex items-end gap-2 sm:gap-3">
                    {report.trend.map((day) => (
                        <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                            <span className="text-[11px] font-semibold text-ink tabular">{day.present}</span>
                            <div className="flex h-28 w-full items-end rounded-lg bg-surface-sunken/70 p-1">
                                <div
                                    className={cn(
                                        'w-full rounded-md transition-[height]',
                                        day.date === report.date ? 'bg-brand' : 'bg-brand/45',
                                    )}
                                    style={{ height: `${Math.max(day.present === 0 ? 2 : 6, day.rate ?? 0)}%` }}
                                    title={`${day.label} ${day.day}: ${pluralize(day.present, 'student')} (${day.rate ?? 0}%)`}
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-[11px] font-medium text-ink">{day.label}</p>
                                <p className="text-[10px] text-ink-soft tabular">{day.day}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card" aria-labelledby="class-attendance-heading">
                <div className="card-head">
                    <div>
                        <h2 id="class-attendance-heading" className="section-title">
                            By class
                        </h2>
                        <p className="meta mt-0.5">
                            {stats.present} of {stats.students} present on {report.date_label}.
                        </p>
                    </div>
                    <span className={cn('chip', rateTone(stats.rate))}>
                        {stats.rate === null ? 'No data' : `${stats.rate}% attendance`}
                    </span>
                </div>

                {report.rows.length === 0 ? (
                    <EmptyState
                        title="No classes yet"
                        body="Create a class and share its key. Once students join a call, the register fills itself."
                        action={
                            <Link href={routes.instructor.classrooms} className="btn btn-outline">
                                Go to classes
                            </Link>
                        }
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="th">Class</th>
                                    <th className="th">Enrolled</th>
                                    <th className="th">Present</th>
                                    <th className="th">Absent</th>
                                    <th className="th">Rate</th>
                                    <th className="th">Status</th>
                                    <th className="th">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.rows.map((row) => (
                                    <tr key={row.id} className="row-hover">
                                        <td className="td">
                                            <Link href={row.class_url} className="font-medium text-ink hover:text-brand">
                                                {row.name}
                                            </Link>
                                            <span className="block text-xs text-ink-soft">
                                                {row.course ?? 'Unassigned course'}
                                            </span>
                                        </td>
                                        <td className="td tabular">{row.members}</td>
                                        <td className="td tabular text-ink">{row.present}</td>
                                        <td className="td tabular">{row.absent}</td>
                                        <td className="td">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full',
                                                            (row.rate ?? 0) >= 75
                                                                ? 'bg-live'
                                                                : (row.rate ?? 0) >= 40
                                                                  ? 'bg-warn'
                                                                  : 'bg-danger',
                                                        )}
                                                        style={{ width: `${row.rate ?? 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs tabular">
                                                    {row.rate === null ? '—' : `${row.rate}%`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="td">
                                            {row.live ? (
                                                <span className="chip chip-live">
                                                    <span className="live-dot" aria-hidden="true" />
                                                    Live
                                                </span>
                                            ) : (
                                                <span className="chip chip-neutral">Closed</span>
                                            )}
                                        </td>
                                        <td className="td text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <Link href={row.attendance_url} className="btn btn-outline btn-sm">
                                                    Register
                                                </Link>
                                                <Link
                                                    href={row.call_url}
                                                    className="btn btn-quiet btn-sm"
                                                    aria-label={`Open the call for ${row.name}`}
                                                >
                                                    <Microphone size={14} weight="duotone" aria-hidden="true" />
                                                </Link>
                                                <Link
                                                    href={row.class_url}
                                                    className="btn btn-quiet btn-sm"
                                                    aria-label={`Open ${row.name}`}
                                                >
                                                    <ArrowRight size={13} weight="bold" aria-hidden="true" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <p className="text-xs leading-relaxed text-ink-muted">
                Attendance is written by the call itself: a record starts when a student&apos;s call token is issued and
                closes when they leave. Nothing on this page is marked by hand.
            </p>
        </>
    );
}
