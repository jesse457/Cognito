import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';
import Meter from '@/components/ui/Meter';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import instructor from '@/lib/instructorRoutes';
import { formatDateTime, percent } from '@/lib/utils';

interface MasteryRow {
    kc_id: number;
    kc_name: string | null;
    mastery_probability: number;
    model_used: string | null;
    last_updated: string | null;
    attempts: number;
    correct_rate: number;
}

interface NoteRow {
    id: number;
    note: string;
    instructor: string | null;
    created_at: string | null;
}

interface LessonOptionGroup {
    course_id: number;
    course_title: string;
    lessons: { id: number; title: string }[];
}

interface InstructorStudentShowProps {
    class: { id: number; name: string };
    student: {
        id: number;
        name: string;
        display_label: string;
        email: string | null;
    };
    rows: MasteryRow[];
    notes: NoteRow[];
    lessons: LessonOptionGroup[];
    threshold: number;
}

export default function InstructorStudentShow({
    class: classSummary,
    student,
    rows,
    notes,
    lessons,
    threshold,
}: InstructorStudentShowProps) {
    const atRiskRows = rows.filter((row) => row.mastery_probability < threshold);

    return (
        <>
            <Head title={student.display_label} />

            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                <Link href={instructor.dashboard.url()} className="hover:text-teal-800">
                    Overview
                </Link>
                <span aria-hidden="true">/</span>
                <Link href={instructor.classes.index.url()} className="hover:text-teal-800">
                    Classes
                </Link>
                <span aria-hidden="true">/</span>
                <Link href={instructor.classes.show.url(classSummary.id)} className="hover:text-teal-800">
                    {classSummary.name}
                </Link>
            </div>

            <PageHeader
                title={student.display_label}
                subtitle={`${student.email ?? 'No email on record'} in ${classSummary.name}. Mastery values come from the knowledge tracing engine and are shown exactly as recorded.`}
                actions={
                    <Link href={instructor.classes.show.url(classSummary.id)} className="btn btn-secondary">
                        Back to class
                    </Link>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <Badge tone={atRiskRows.length > 0 ? 'danger' : 'success'}>
                    {atRiskRows.length > 0 ? `${atRiskRows.length} components at risk` : 'on track'}
                </Badge>
                <span className="meta">{rows.length} knowledge components with mastery data</span>
                <span className="meta">Threshold {percent(threshold)}</span>
            </div>

            <Card>
                <CardHeader
                    title="Mastery by knowledge component"
                    description="Attempts and correct rate are counted from practice answer history for the same component."
                />
                {rows.length === 0 ? (
                    <EmptyState
                        title="No mastery data yet"
                        body="The knowledge tracing engine has not recorded a probability for this student. It appears after the first practice session."
                    />
                ) : (
                    <TableWrapper>
                        <thead>
                            <tr>
                                <Th>Knowledge component</Th>
                                <Th>Mastery</Th>
                                <Th>Engine</Th>
                                <Th>Last updated</Th>
                                <Th>Attempts</Th>
                                <Th>Correct rate</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <Tr key={row.kc_id}>
                                    <Td>
                                        <p className="font-medium text-zinc-900">
                                            {row.kc_name ?? `Knowledge component #${row.kc_id}`}
                                        </p>
                                        {row.mastery_probability < threshold ? (
                                            <p className="meta mt-0.5 text-red-700">below threshold</p>
                                        ) : null}
                                    </Td>
                                    <Td className="w-52">
                                        <Meter
                                            value={row.mastery_probability}
                                            label={`Mastery for ${row.kc_name ?? `component ${row.kc_id}`}`}
                                        />
                                    </Td>
                                    <Td>
                                        <Badge tone="neutral">{(row.model_used ?? 'unknown').toUpperCase()}</Badge>
                                    </Td>
                                    <Td className="whitespace-nowrap text-zinc-500">
                                        {formatDateTime(row.last_updated)}
                                    </Td>
                                    <Td className="whitespace-nowrap text-zinc-600 tabular-nums">{row.attempts}</Td>
                                    <Td className="whitespace-nowrap text-zinc-600 tabular-nums">
                                        {row.attempts === 0 ? '—' : percent(row.correct_rate)}
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </TableWrapper>
                )}
            </Card>

            {lessons.length > 0 ? (
                <Card>
                    <CardHeader
                        title="Assign a lesson"
                        description="Give this student one lesson. Assigning a lesson also enrolls them in the course it belongs to."
                    />
                    <CardBody>
                        <AssignLessonForm classId={classSummary.id} studentId={student.id} lessonOptions={lessons} />
                    </CardBody>
                </Card>
            ) : (
                <Card>
                    <CardHeader title="Assign a lesson" />
                    <EmptyState
                        title="No assignable lessons"
                        body="Publish a course with lessons before assigning one to this student."
                    />
                </Card>
            )}

            <Card>
                <CardHeader
                    title="Private notes"
                    description="These notes are yours alone. Students never see them, and neither do other instructors."
                />
                <CardBody>
                    <NoteForm classId={classSummary.id} studentId={student.id} />
                </CardBody>

                {notes.length === 0 ? (
                    <EmptyState title="No notes yet" body="Write down what you observed so the next session starts informed." />
                ) : (
                    <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
                        {notes.map((note) => (
                            <li key={note.id} className="px-5 py-4">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="meta">
                                        {note.instructor ?? 'You'} · private note
                                    </p>
                                    <p className="meta">{formatDateTime(note.created_at)}</p>
                                </div>
                                <p className="mt-1 max-w-[80ch] text-sm whitespace-pre-line text-zinc-700">
                                    {note.note}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </>
    );
}

function AssignLessonForm({
    classId,
    studentId,
    lessonOptions,
}: {
    classId: number;
    studentId: number;
    lessonOptions: LessonOptionGroup[];
}) {
    const [courseId, setCourseId] = useState<string>(String(lessonOptions[0]?.course_id ?? ''));
    const { data, setData, post, processing, errors, reset } = useForm({
        lesson_id: '',
        due_at: '',
    });

    const activeGroup = lessonOptions.find((group) => String(group.course_id) === courseId) ?? null;

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(instructor.classes.students.lessons.store.url({ class: classId, student: studentId }), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Course" htmlFor="student-lesson-course" hint="Narrows the lesson list.">
                    <select
                        id="student-lesson-course"
                        className={selectClass}
                        value={courseId}
                        onChange={(event) => {
                            setCourseId(event.target.value);
                            setData('lesson_id', '');
                        }}
                    >
                        {lessonOptions.map((group) => (
                            <option key={group.course_id} value={group.course_id}>
                                {group.course_title}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Lesson" htmlFor="student-lesson-lesson" required error={errors.lesson_id}>
                    <select
                        id="student-lesson-lesson"
                        className={selectClass}
                        value={data.lesson_id}
                        onChange={(event) => setData('lesson_id', event.target.value)}
                        required
                    >
                        <option value="">Choose a lesson</option>
                        {(activeGroup?.lessons ?? []).map((lesson) => (
                            <option key={lesson.id} value={lesson.id}>
                                {lesson.title}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Due date" htmlFor="student-lesson-due" hint="Optional." error={errors.due_at}>
                    <input
                        id="student-lesson-due"
                        type="date"
                        className={inputClass}
                        value={data.due_at}
                        onChange={(event) => setData('due_at', event.target.value)}
                    />
                </Field>
            </div>

            <div className="form-footer">
                <button type="submit" className="btn btn-primary" disabled={processing}>
                    {processing ? 'Assigning lesson' : 'Assign lesson'}
                </button>
            </div>
        </form>
    );
}

function NoteForm({ classId, studentId }: { classId: number; studentId: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        note: '',
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(instructor.classes.students.notes.store.url({ class: classId, student: studentId }), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <Field
                label="New note"
                htmlFor="student-note"
                required
                error={errors.note}
                hint="Private to you. Up to 4000 characters."
            >
                <textarea
                    id="student-note"
                    className={inputClass}
                    rows={4}
                    maxLength={4000}
                    value={data.note}
                    onChange={(event) => setData('note', event.target.value)}
                    placeholder="What did you observe in this student's mastery figures?"
                    required
                />
            </Field>

            <div className="form-footer">
                <button type="submit" className="btn btn-primary" disabled={processing}>
                    {processing ? 'Saving note' : 'Save note'}
                </button>
            </div>
        </form>
    );
}
