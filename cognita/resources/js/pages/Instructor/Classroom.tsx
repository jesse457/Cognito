import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowsClockwise,
    CalendarBlank,
    DownloadSimple,
    FilePdf,
    Microphone,
    Trash,
    Users,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import KeyChip from '@/components/ui/KeyChip';
import Select from '@/components/ui/Select';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';

interface ClassroomPageProps {
    classroom: {
        id: number;
        name: string;
        join_code: string;
        course_id: number | null;
        course: string | null;
        created_at: string | null;
        call_url: string;
        board: {
            surface: string;
            students_can_annotate: boolean;
            has_document: boolean;
        };
    };
    students: Array<{
        id: number;
        name: string;
        email: string;
        joined_at: string | null;
        can_draw: boolean;
        attendance_status: string;
    }>;
    attendance: {
        date: string;
        date_label: string;
        present: number;
        absent: number;
    };
    courses: Array<{ id: number; title: string }>;
}

const surfaceLabels: Record<string, string> = {
    canvas: 'Blank canvas',
    pdf: 'PDF',
};

export default function InstructorClassroom({ classroom, students, attendance, courses }: ClassroomPageProps) {
    const [confirming, setConfirming] = useState(false);
    const [attendanceDate, setAttendanceDate] = useState(attendance.date);
    const settings = useForm({
        name: classroom.name,
        course_id: classroom.course_id === null ? '' : String(classroom.course_id),
    });
    const destroy = useForm({});

    function saveSettings(event: FormEvent): void {
        event.preventDefault();
        settings.patch(routes.instructor.classroom(classroom.id), { preserveScroll: true });
    }

    function toggleStudentDrawing(): void {
        router.patch(
            routes.board(classroom.id),
            { students_can_annotate: !classroom.board.students_can_annotate },
            { preserveScroll: true },
        );
    }

    function toggleIndividualDrawing(studentId: number, canDraw: boolean): void {
        router.patch(
            routes.instructor.studentDrawing(classroom.id, studentId),
            { can_draw: canDraw },
            { preserveScroll: true, preserveState: true },
        );
    }

    function changeAttendanceDate(date: string): void {
        setAttendanceDate(date);
        if (date === '') return;
        router.get(
            routes.instructor.classroom(classroom.id),
            { date },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title={classroom.name} />

            <nav className="flex items-center gap-1.5 text-xs text-ink-muted" aria-label="Breadcrumb">
                <Link href={routes.instructor.classrooms} className="hover:text-ink">
                    Classes
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-ink">{classroom.name}</span>
            </nav>

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="eyebrow">{classroom.course ?? 'Unassigned course'}</p>
                    <h1 className="page-title mt-1.5 truncate">{classroom.name}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                            Class key
                            <KeyChip code={classroom.join_code} compact />
                        </span>
                        <span className="chip chip-neutral">
                            <Users size={13} aria-hidden="true" />
                            {pluralize(students.length, 'student')}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={routes.instructor.classroomAttendance(classroom.id, attendanceDate)}
                        className="btn btn-outline"
                        title="The register for one day, with the Excel and PDF downloads"
                    >
                        <CalendarBlank size={16} aria-hidden="true" />
                        Attendance
                    </Link>
                    <Button
                        variant="outline"
                        onClick={() =>
                            router.post(routes.instructor.classroomKey(classroom.id), {}, { preserveScroll: true })
                        }
                        title="Replace the class key. Students already inside keep access."
                    >
                        <ArrowsClockwise size={16} aria-hidden="true" />
                        New key
                    </Button>
                    <Link href={classroom.call_url} className="btn btn-primary">
                        <Microphone size={16} weight="duotone" aria-hidden="true" />
                        Start live call
                    </Link>
                </div>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
                <section className="card" aria-labelledby="roster-heading">
                    <div className="card-head">
                        <div>
                            <h2 id="roster-heading" className="section-title">
                                Roster
                            </h2>
                            <p className="meta mt-0.5">Students appear here after entering the class key.</p>
                        </div>
                        <span className="chip chip-neutral">{pluralize(students.length, 'student')}</span>
                    </div>

                    {students.length === 0 ? (
                        <div className="empty">
                            <p className="text-sm font-semibold text-ink">Nobody has used the key yet</p>
                            <p className="max-w-sm text-sm text-ink-muted">
                                Share {classroom.join_code} with your students. The room opens as soon as the first one
                                joins.
                            </p>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="th">Student</th>
                                        <th className="th">Email</th>
                                        <th className="th">Draw</th>
                                        <th className="th">Attendance</th>
                                        <th className="th">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => (
                                        <tr key={student.id} className="row-hover">
                                            <td className="td font-medium text-ink">{student.name}</td>
                                            <td className="td">{student.email}</td>
                                            <td className="td">
                                                <label className="inline-flex cursor-pointer items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={student.can_draw}
                                                        onChange={(event) =>
                                                            toggleIndividualDrawing(student.id, event.target.checked)
                                                        }
                                                        className="h-4 w-4 rounded border-line-strong text-brand focus:ring-brand"
                                                    />
                                                    <span className="text-xs">{student.can_draw ? 'Allowed' : 'View only'}</span>
                                                </label>
                                            </td>
                                            <td className="td">
                                                <span
                                                    className={cn(
                                                        'chip',
                                                        student.attendance_status === 'Present'
                                                            ? 'chip-live'
                                                            : 'chip-neutral',
                                                    )}
                                                >
                                                    {student.attendance_status}
                                                </span>
                                            </td>
                                            <td className="td tabular">{student.joined_at ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <div className="flex flex-col gap-6">
                    <section className="card p-5" aria-labelledby="settings-heading">
                        <h2 id="settings-heading" className="section-title">
                            Class settings
                        </h2>

                        <form onSubmit={saveSettings} className="mt-4 flex flex-col gap-4">
                            <Field label="Name" error={settings.errors.name}>
                                {(id) => (
                                    <TextInput
                                        id={id}
                                        value={settings.data.name}
                                        onChange={(event) => settings.setData('name', event.target.value)}
                                        invalid={Boolean(settings.errors.name)}
                                    />
                                )}
                            </Field>

                            <Field label="Course" error={settings.errors.course_id}>
                                {(id) => (
                                    <Select
                                        id={id}
                                        value={settings.data.course_id}
                                        onChange={(course) => settings.setData('course_id', course)}
                                        invalid={Boolean(settings.errors.course_id)}
                                        options={[
                                            { value: '', label: 'No course' },
                                            ...courses.map((course) => ({ value: String(course.id), label: course.title })),
                                        ]}
                                    />
                                )}
                            </Field>

                            <Button type="submit" variant="outline" disabled={settings.processing}>
                                {settings.processing ? 'Saving' : 'Save changes'}
                            </Button>
                        </form>
                    </section>

                    <section className="card p-5" aria-labelledby="board-heading">
                        <h2 id="board-heading" className="section-title">
                            Board
                        </h2>
                        <p className="meta mt-1">
                            The board is part of the live call. Current surface:{' '}
                            <span className="font-medium text-ink">
                                {surfaceLabels[classroom.board.surface] ?? classroom.board.surface}
                            </span>
                            {classroom.board.has_document ? ' with a PDF attached' : ''}.
                        </p>

                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-sunken/60 p-3">
                            <input
                                type="checkbox"
                                checked={classroom.board.students_can_annotate}
                                onChange={toggleStudentDrawing}
                                className="mt-0.5 h-4 w-4 rounded border-line-strong text-brand focus:ring-brand"
                            />
                            <span>
                                <span className="block text-sm font-medium text-ink">Students can draw</span>
                                <span className="mt-0.5 block text-xs text-ink-muted">
                                    This is the master switch. Use the roster to choose which students may draw.
                                </span>
                            </span>
                        </label>
                    </section>

                    <section className="card p-5" aria-labelledby="attendance-heading">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 id="attendance-heading" className="section-title">
                                    Attendance
                                </h2>
                                <p className="meta mt-1">Recorded automatically when students join the call.</p>
                            </div>
                            <CalendarBlank size={20} className="text-ink-soft" aria-hidden="true" />
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                            <Field label="Attendance date">
                                {(id) => (
                                    <TextInput
                                        id={id}
                                        type="date"
                                        value={attendanceDate}
                                        onChange={(event) => changeAttendanceDate(event.target.value)}
                                    />
                                )}
                            </Field>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-line bg-surface-sunken/60 p-3">
                                    <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
                                        Present
                                    </p>
                                    <p className="mt-0.5 text-xl font-semibold text-ink">{attendance.present}</p>
                                </div>
                                <div className="rounded-xl border border-line bg-surface-sunken/60 p-3">
                                    <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
                                        Absent
                                    </p>
                                    <p className="mt-0.5 text-xl font-semibold text-ink">{attendance.absent}</p>
                                </div>
                            </div>

                            <p className="hint mt-0">{attendance.date_label}</p>

                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href={routes.instructor.classroomAttendance(classroom.id, attendanceDate)}
                                    className="btn btn-quiet btn-sm"
                                >
                                    Full register
                                    <ArrowRight size={14} weight="bold" aria-hidden="true" />
                                </Link>
                                <a
                                    href={routes.instructor.attendanceExport(classroom.id, 'xlsx', attendanceDate)}
                                    className="btn btn-outline btn-sm"
                                >
                                    <DownloadSimple size={14} aria-hidden="true" />
                                    Excel
                                </a>
                                <a
                                    href={routes.instructor.attendanceExport(classroom.id, 'pdf', attendanceDate)}
                                    className="btn btn-outline btn-sm"
                                >
                                    <FilePdf size={14} aria-hidden="true" />
                                    PDF
                                </a>
                            </div>
                        </div>
                    </section>

                    <section className="card p-5" aria-labelledby="danger-heading">
                        <h2 id="danger-heading" className="section-title">
                            Delete class
                        </h2>
                        <p className="meta mt-1">Removes the class, its key, its board and its PDF.</p>

                        {confirming ? (
                            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-danger/20 bg-danger-soft/60 p-3">
                                <p className="text-sm text-ink">This cannot be undone. Delete {classroom.name}?</p>
                                <div className="flex gap-2">
                                    <Button variant="quiet" size="sm" onClick={() => setConfirming(false)}>
                                        Keep class
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() =>
                                            destroy.delete(routes.instructor.classroom(classroom.id), {
                                                onFinish: () => setConfirming(false),
                                            })
                                        }
                                    >
                                        <Trash size={14} aria-hidden="true" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button variant="danger" className="mt-3" size="sm" onClick={() => setConfirming(true)}>
                                <Trash size={14} aria-hidden="true" />
                                Delete class
                            </Button>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
