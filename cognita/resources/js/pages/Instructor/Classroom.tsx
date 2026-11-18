import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowsClockwise,
    CalendarBlank,
    DownloadSimple,
    FilePdf,
    Microphone,
    Trash,
    UploadSimple,
    Users,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import KeyChip from '@/components/ui/KeyChip';
import Select from '@/components/ui/Select';
import LiveChip from '@/components/ui/LiveChip';
import { routes } from '@/lib/routes';
import { cn, formatBytes, formatMoment, formatUntil, pluralize } from '@/lib/utils';
import type { ClassMaterial, ClassSession } from '@/types';

interface ClassroomPageProps {
    classroom: {
        id: number;
        name: string;
        join_code: string;
        course_id: number | null;
        course: string | null;
        requires_payment: boolean;
        price_label: string | null;
        created_at: string | null;
        call_url: string;
        board: {
            surface: string;
            has_document: boolean;
        };
    };
    students: Array<{
        id: number;
        name: string;
        email: string;
        joined_at: string | null;
        attendance_status: string;
        payment_status: string;
        payment_label: string;
        payment_reference: string | null;
        amount_paid_cents: number;
        paid_at: string | null;
    }>;
    payment: {
        required: boolean;
        price_label: string | null;
        paid: number;
        pending: number;
        locked: number;
    };
    attendance: {
        date: string;
        date_label: string;
        present: number;
        absent: number;
    };
    courses: Array<{ id: number; title: string }>;
    sessions: ClassSession[];
    materials: ClassMaterial[];
}

const surfaceLabels: Record<string, string> = {
    canvas: 'Blank canvas',
    pdf: 'PDF',
};

export default function InstructorClassroom({
    classroom,
    students,
    payment,
    attendance,
    courses,
    sessions,
    materials,
}: ClassroomPageProps) {
    const [confirming, setConfirming] = useState(false);
    const [attendanceDate, setAttendanceDate] = useState(attendance.date);
    const settings = useForm({
        name: classroom.name,
        course_id: classroom.course_id === null ? '' : String(classroom.course_id),
    });
    const destroy = useForm({});
    const schedule = useForm({
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        document_ids: [] as number[],
    });
    const upload = useForm({ document: null as File | null });
    const [uploadKey, setUploadKey] = useState(0);

    function saveSettings(event: FormEvent): void {
        event.preventDefault();
        settings.patch(routes.instructor.classroom(classroom.id), { preserveScroll: true });
    }

    function scheduleSession(event: FormEvent): void {
        event.preventDefault();

        schedule.post(routes.callSessionSchedule(classroom.id), {
            preserveScroll: true,
            onSuccess: () => schedule.reset('title', 'description', 'starts_at', 'ends_at', 'document_ids'),
        });
    }

    function setPayment(studentId: number, status: 'paid' | 'unpaid'): void {
        router.patch(
            routes.instructor.studentPayment(classroom.id, studentId),
            { payment_status: status },
            { preserveScroll: true },
        );
    }

    function uploadMaterial(event: FormEvent): void {
        event.preventDefault();

        if (upload.data.document === null) {
            return;
        }

        upload.post(routes.instructor.classMaterials(classroom.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                upload.reset();
                setUploadKey((key) => key + 1);
            },
        });
    }

    function toggleMaterial(id: number): void {
        const picked = schedule.data.document_ids;

        schedule.setData('document_ids', picked.includes(id) ? picked.filter((item) => item !== id) : [...picked, id]);
    }

    function startSession(): void {
        router.post(routes.callSessionStart(classroom.id), {}, { preserveScroll: true });
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
                        {classroom.requires_payment ? (
                            <span className="chip chip-brand">Paid course · {classroom.price_label}</span>
                        ) : null}
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
                        <Microphone size={16} aria-hidden="true" />
                        {sessions.some((session) => session.state === 'waiting') ? 'Start the session' : 'Open the room'}
                    </Link>
                </div>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="flex flex-col gap-6">
                    <section className="card" aria-labelledby="sessions-heading">
                        <div className="card-head">
                            <div>
                                <h2 id="sessions-heading" className="section-title">
                                    Sessions
                                </h2>
                                <p className="meta mt-0.5">
                                    Announce a session and your students can wait in the room for it. A session that has
                                    passed cannot be entered again.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={scheduleSession} className="flex flex-col gap-3 border-b border-line px-4 py-4">
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px_210px]">
                                <Field label="What is the session?" error={schedule.errors.title}>
                                    {(id) => (
                                        <TextInput
                                            id={id}
                                            value={schedule.data.title}
                                            onChange={(event) => schedule.setData('title', event.target.value)}
                                            placeholder="Momentum problem set"
                                            invalid={Boolean(schedule.errors.title)}
                                        />
                                    )}
                                </Field>

                                <Field label="Starts" error={schedule.errors.starts_at}>
                                    {(id) => (
                                        <TextInput
                                            id={id}
                                            type="datetime-local"
                                            value={schedule.data.starts_at}
                                            onChange={(event) => schedule.setData('starts_at', event.target.value)}
                                            invalid={Boolean(schedule.errors.starts_at)}
                                        />
                                    )}
                                </Field>

                                <Field label="Ends" error={schedule.errors.ends_at}>
                                    {(id) => (
                                        <TextInput
                                            id={id}
                                            type="datetime-local"
                                            value={schedule.data.ends_at}
                                            onChange={(event) => schedule.setData('ends_at', event.target.value)}
                                            invalid={Boolean(schedule.errors.ends_at)}
                                        />
                                    )}
                                </Field>
                            </div>

                            <Field
                                label="Details"
                                hint="Optional. What the session covers, what to prepare, or anything students should know before they join."
                                error={schedule.errors.description}
                            >
                                {(id) => (
                                    <TextArea
                                        id={id}
                                        value={schedule.data.description}
                                        onChange={(event) => schedule.setData('description', event.target.value)}
                                        placeholder="We will finish the momentum problem set and review last week's questions."
                                        rows={2}
                                        invalid={Boolean(schedule.errors.description)}
                                    />
                                )}
                            </Field>

                            <fieldset>
                                <legend className="label">Materials to read before the session</legend>
                                {materials.length === 0 ? (
                                    <p className="hint mt-1">
                                        Upload a PDF in the Materials section below, then attach it here.
                                    </p>
                                ) : (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {materials.map((material) => {
                                            const picked = schedule.data.document_ids.includes(material.id);

                                            return (
                                                <label
                                                    key={material.id}
                                                    className={cn(
                                                        'chip cursor-pointer select-none',
                                                        picked ? 'chip-brand' : 'chip-neutral',
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={picked}
                                                        onChange={() => toggleMaterial(material.id)}
                                                    />
                                                    <FilePdf size={14} aria-hidden="true" />
                                                    {material.name}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </fieldset>

                            <div>
                                <Button type="submit" variant="primary" disabled={schedule.processing}>
                                    <CalendarBlank size={16} aria-hidden="true" />
                                    {schedule.processing ? 'Scheduling' : 'Schedule session'}
                                </Button>
                                <p className="hint mt-2">
                                    A session works with or without a course: give it its own title, details and time.
                                    Leaving the end empty gives it one hour. Students see it on their class page and may
                                    wait in the room from the start time.
                                </p>
                            </div>
                        </form>

                        {sessions.length === 0 ? (
                            <EmptyState
                                title="No sessions yet"
                                body="Schedule one above. Students can only enter a session you announced, and only while it is still ahead of them."
                            />
                        ) : (
                            <ul className="divide-y divide-line">
                                {sessions.map((session) => (
                                    <li key={session.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13.5px] font-medium text-ink">
                                                {session.title ?? 'Class session'}
                                            </p>
                                            <p className="meta mt-0.5">
                                                {[
                                                    formatMoment(session.starts_at) ?? session.when,
                                                    session.state === 'waiting' ? formatUntil(session.starts_at) : null,
                                                    session.materials.length > 0
                                                        ? pluralize(session.materials.length, 'material')
                                                        : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                            {session.description ? (
                                                <p className="mt-1.5 max-w-[70ch] text-[12.5px] leading-relaxed text-ink-muted">
                                                    {session.description}
                                                </p>
                                            ) : null}
                                        </div>

                                        {session.state === 'live' ? (
                                            <LiveChip label="Live" />
                                        ) : session.state === 'waiting' ? (
                                            <span className="chip chip-brand">Scheduled</span>
                                        ) : (
                                            <span className="chip chip-neutral">Ended</span>
                                        )}

                                        {session.state === 'waiting' ? (
                                            <Button variant="primary" size="sm" onClick={startSession}>
                                                <Microphone size={15} aria-hidden="true" />
                                                Start now
                                            </Button>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                <section className="card" aria-labelledby="materials-heading">
                    <div className="card-head">
                        <div>
                            <h2 id="materials-heading" className="section-title">
                                Materials
                            </h2>
                            <p className="meta mt-0.5">
                                PDFs students can download before a session. Attach them when you schedule the session.
                            </p>
                        </div>
                        <span className="chip chip-neutral">{pluralize(materials.length, 'file')}</span>
                    </div>

                    <form onSubmit={uploadMaterial} className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-end">
                        <Field label="Add a PDF" error={upload.errors.document}>
                            {(id) => (
                                <input
                                    key={uploadKey}
                                    id={id}
                                    type="file"
                                    accept="application/pdf"
                                    className="input w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand"
                                    onChange={(event) => {
                                        upload.setData('document', event.target.files?.[0] ?? null);
                                        upload.clearErrors('document');
                                    }}
                                />
                            )}
                        </Field>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={upload.processing || upload.data.document === null}
                        >
                            <UploadSimple size={16} aria-hidden="true" />
                            {upload.processing ? 'Uploading' : 'Upload'}
                        </Button>
                    </form>

                    {materials.length === 0 ? (
                        <EmptyState
                            title="No materials yet"
                            body="Upload a PDF, then tick it when you schedule a session. Students see the download on their class page before the room opens."
                        />
                    ) : (
                        <ul className="divide-y divide-line">
                            {materials.map((material) => (
                                <li key={material.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                    <FilePdf size={18} aria-hidden="true" className="shrink-0 text-brand" />
                                    <div className="min-w-0 flex-1">
                                        <a
                                            href={material.url}
                                            className="block truncate text-[13.5px] font-medium text-ink hover:text-brand"
                                        >
                                            {material.name}
                                        </a>
                                        <p className="meta mt-0.5">
                                            {[
                                                formatBytes(material.size),
                                                pluralize(material.pages, 'page'),
                                                material.added,
                                            ].join(' · ')}
                                        </p>
                                    </div>
                                    <Button
                                        variant="quiet"
                                        size="sm"
                                        title={`Remove ${material.name} from this class`}
                                        onClick={() =>
                                            router.delete(routes.instructor.classMaterial(classroom.id, material.id), {
                                                preserveScroll: true,
                                            })
                                        }
                                    >
                                        <Trash size={15} aria-hidden="true" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

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

                    {payment.required ? (
                        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-sunken/40 px-4 py-3">
                            <span className="chip chip-brand">Paid course · {payment.price_label}</span>
                            <span className="chip chip-live">{payment.paid} paid</span>
                            {payment.pending > 0 ? <span className="chip chip-brand">{payment.pending} awaiting</span> : null}
                            {payment.locked > 0 ? <span className="chip chip-neutral">{payment.locked} locked</span> : null}
                            <p className="meta ml-auto">Confirm a student's payment to unlock the live room for them.</p>
                        </div>
                    ) : null}

                    {students.length === 0 ? (
                        <EmptyState
                            title="Nobody has used the key yet"
                            body={`Share ${classroom.join_code} with your students. The room opens as soon as the first one joins.`}
                        />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="th">Student</th>
                                        <th className="th">Email</th>
                                        <th className="th">Attendance</th>
                                        {payment.required ? <th className="th">Payment</th> : null}
                                        <th className="th">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => (
                                        <tr key={student.id} className="row-hover">
                                            <td className="td font-medium text-ink">{student.name}</td>
                                            <td className="td">{student.email}</td>
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
                                            {payment.required ? (
                                                <td className="td">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={cn(
                                                                'chip',
                                                                student.payment_status === 'paid'
                                                                    ? 'chip-live'
                                                                    : student.payment_status === 'pending'
                                                                      ? 'chip-brand'
                                                                      : 'chip-neutral',
                                                            )}
                                                        >
                                                            {student.payment_label}
                                                        </span>
                                                        {student.payment_status === 'paid' ? (
                                                            <Button
                                                                variant="quiet"
                                                                size="sm"
                                                                onClick={() => setPayment(student.id, 'unpaid')}
                                                            >
                                                                Revoke
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => setPayment(student.id, 'paid')}
                                                            >
                                                                Confirm
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {student.payment_reference ? (
                                                        <p className="meta mt-1">Ref: {student.payment_reference}</p>
                                                    ) : null}
                                                </td>
                                            ) : null}
                                            <td className="td tabular">{student.joined_at ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
                </div>

                <div className="flex flex-col gap-6">
                    <section className="card p-4" aria-labelledby="settings-heading">
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

                    <section className="card p-4" aria-labelledby="board-heading">
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

                        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
                            The pen is handed over in the room. While a class session is live, tick a student in{' '}
                            <span className="font-medium text-ink">Participants</span> and they may draw on the
                            board — for that lesson only. Nothing is written down, so the next class starts
                            without it.
                        </p>
                    </section>

                    <section className="card p-4" aria-labelledby="attendance-heading">
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

                    <section className="card p-4" aria-labelledby="danger-heading">
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
