import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Badge, { statusTone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';
import Meter from '@/components/ui/Meter';
import Stat from '@/components/ui/Stat';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import instructor from '@/lib/instructorRoutes';
import liveCallRoutes from '@/lib/liveCallRoutes';
import { formatDateTime, percent } from '@/lib/utils';

interface ClassSummary {
    id: number;
    name: string;
    description: string | null;
    join_code: string;
    status: string;
    max_students: number;
    active_students: number;
    created_at: string | null;
}

interface ClassKpis {
    active_students: number;
    students: number;
    avg_mastery: number;
    at_risk_count: number;
    assigned_courses_count: number;
}

interface RosterRow {
    id: number;
    name: string;
    display_label: string;
    email: string | null;
    avg_mastery: number;
    at_risk: boolean;
    attempts: number;
    last_activity: string | null;
}

interface AtRiskRow {
    student_id: number;
    student_name: string;
    student_email: string | null;
    class_id: number | null;
    lowest_mastery: number;
    at_risk_kc_count: number;
    kc_ids: number[];
}

interface AnnouncementRow {
    id: number;
    title: string;
    body: string;
    published_at: string | null;
    instructor: string | null;
}

interface AssignedCourseRow {
    id: number;
    course_id: number;
    title: string | null;
    assigned_at: string | null;
}

interface CourseOption {
    id: number;
    title: string;
}

interface LessonOptionGroup {
    course_id: number;
    course_title: string;
    lessons: { id: number; title: string }[];
}

interface SnapshotSummary {
    id: number;
    snapshot_date: string | null;
    created_at: string | null;
}

interface Briefing {
    summary: string;
    suggested_interventions: string[];
    engine: string;
}

interface InstructorClassShowProps {
    class: ClassSummary;
    kpis: ClassKpis;
    students: RosterRow[];
    atRisk: AtRiskRow[];
    announcements: AnnouncementRow[];
    assignedCourses: AssignedCourseRow[];
    courses: CourseOption[];
    lessonOptions: LessonOptionGroup[];
    latestSnapshot: SnapshotSummary | null;
    /** Deferred: undefined on the first paint, then the resolved payload. */
    briefing?: Briefing;
    capabilities: {
        can_announce: boolean;
        can_assign: boolean;
        can_invite: boolean;
        can_snapshot: boolean;
        can_live_call: boolean;
    };
}

export default function InstructorClassShow({
    class: classSummary,
    kpis,
    students,
    atRisk,
    announcements,
    assignedCourses,
    courses,
    lessonOptions,
    latestSnapshot,
    briefing,
    capabilities,
}: InstructorClassShowProps) {
    function takeSnapshot() {
        router.post(instructor.classes.snapshot.url(classSummary.id), {}, { preserveScroll: true });
    }

    return (
        <>
            <Head title={classSummary.name} />

            <PageHeader
                title={classSummary.name}
                subtitle={classSummary.description ?? 'No description yet.'}
                actions={
                    <>
                        <Link href={instructor.classes.index.url()} className="btn btn-secondary">
                            All classes
                        </Link>
                        {capabilities.can_live_call ? (
                            <Link href={liveCallRoutes.show.url(classSummary.id)} className="btn btn-secondary">
                                Live voice call
                            </Link>
                        ) : null}
                        {capabilities.can_snapshot ? (
                            <button type="button" className="btn btn-primary" onClick={takeSnapshot}>
                                Snapshot analytics
                            </button>
                        ) : null}
                    </>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(classSummary.status)}>{classSummary.status}</Badge>
                <span className="meta">Join code</span>
                <code className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[12px] tracking-wider text-zinc-800">
                    {classSummary.join_code}
                </code>
                <span className="meta">Maximum {classSummary.max_students} students</span>
                <span className="meta">Created {formatDateTime(classSummary.created_at)}</span>
                <span className="meta">
                    Latest snapshot{' '}
                    {latestSnapshot?.snapshot_date ? formatDateTime(latestSnapshot.snapshot_date) : 'not taken yet'}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                    label="Active students"
                    value={kpis.active_students}
                    hint={`${kpis.students} enrolled in total`}
                />
                <Stat
                    label="Average mastery"
                    value={percent(kpis.avg_mastery)}
                    tone={kpis.avg_mastery < 0.6 ? 'warn' : 'accent'}
                    hint="Read from the knowledge tracing engine"
                />
                <Stat
                    label="Students at risk"
                    value={kpis.at_risk_count}
                    tone={kpis.at_risk_count > 0 ? 'danger' : 'default'}
                    hint="At least one knowledge component below threshold"
                />
                <Stat
                    label="Courses assigned"
                    value={kpis.assigned_courses_count}
                    hint={assignedCourses.length > 0 ? 'Enrolled for the whole class' : 'Nothing assigned yet'}
                />
            </div>

            <Card>
                <CardHeader
                    title="At-risk students"
                    description="Students with at least one knowledge component below the configured mastery threshold. Lowest mastery is shown first."
                />
                {atRisk.length === 0 ? (
                    <EmptyState title="No student is at risk" body="Every active student is above the mastery threshold." />
                ) : (
                    <TableWrapper>
                        <thead>
                            <tr>
                                <Th>Student</Th>
                                <Th>Lowest mastery</Th>
                                <Th>Components below threshold</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {atRisk.map((row) => (
                                <Tr key={row.student_id}>
                                    <Td>
                                        <Link
                                            href={instructor.classes.students.show.url({
                                                class: classSummary.id,
                                                student: row.student_id,
                                            })}
                                            className="font-medium text-zinc-900 hover:text-teal-800"
                                        >
                                            {row.student_name}
                                        </Link>
                                        <p className="meta mt-0.5">{row.student_email ?? 'no email on record'}</p>
                                    </Td>
                                    <Td className="w-56">
                                        <Meter
                                            value={row.lowest_mastery}
                                            tone="danger"
                                            label={`Lowest mastery for ${row.student_name}`}
                                        />
                                    </Td>
                                    <Td className="whitespace-nowrap text-zinc-600 tabular-nums">
                                        {row.at_risk_kc_count}
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </TableWrapper>
                )}
            </Card>

            <Card>
                <CardHeader
                    title="Roster"
                    description="Average mastery per active student, with practice attempts and the last recorded answer."
                />
                {students.length === 0 ? (
                    <EmptyState
                        title="Nobody is enrolled yet"
                        body="Share the join code, or invite a student by email further down this page."
                    />
                ) : (
                    <TableWrapper>
                        <thead>
                            <tr>
                                <Th>Student</Th>
                                <Th>Average mastery</Th>
                                <Th>At risk</Th>
                                <Th>Attempts</Th>
                                <Th>Last activity</Th>
                                <Th className="text-right">Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <Tr key={student.id}>
                                    <Td>
                                        <Link
                                            href={instructor.classes.students.show.url({
                                                class: classSummary.id,
                                                student: student.id,
                                            })}
                                            className="font-medium text-zinc-900 hover:text-teal-800"
                                        >
                                            {student.display_label}
                                        </Link>
                                        <p className="meta mt-0.5">{student.email ?? 'no email on record'}</p>
                                    </Td>
                                    <Td className="w-52">
                                        <Meter
                                            value={student.avg_mastery}
                                            label={`Average mastery for ${student.display_label}`}
                                        />
                                    </Td>
                                    <Td>
                                        {student.at_risk ? (
                                            <Badge tone="danger">at risk</Badge>
                                        ) : (
                                            <Badge tone="success">on track</Badge>
                                        )}
                                    </Td>
                                    <Td className="whitespace-nowrap text-zinc-600 tabular-nums">{student.attempts}</Td>
                                    <Td className="whitespace-nowrap text-zinc-500">
                                        {formatDateTime(student.last_activity)}
                                    </Td>
                                    <Td className="text-right">
                                        <Link
                                            href={instructor.classes.students.show.url({
                                                class: classSummary.id,
                                                student: student.id,
                                            })}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Open
                                        </Link>
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </TableWrapper>
                )}
            </Card>

            {capabilities.can_assign ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <Card>
                        <CardHeader
                            title="Assign a course"
                            description="Assigning a course to the class also enrolls every active student in it."
                        />
                        <CardBody>
                            {courses.length === 0 ? (
                                <EmptyState title="No assignable courses" body="Publish a course before assigning it." />
                            ) : (
                                <AssignCourseForm classId={classSummary.id} courses={courses} />
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            title="Assign a lesson to one student"
                            description="Give a single student one lesson. Use this for remediation while the rest of the class continues."
                        />
                        <CardBody>
                            {students.length === 0 || lessonOptions.length === 0 ? (
                                <EmptyState
                                    title="Nothing to assign yet"
                                    body="A lesson assignment needs at least one active student and one published course with lessons."
                                />
                            ) : (
                                <AssignLessonForm
                                    classId={classSummary.id}
                                    students={students}
                                    lessonOptions={lessonOptions}
                                />
                            )}
                        </CardBody>
                    </Card>
                </div>
            ) : null}

            {assignedCourses.length > 0 ? (
                <Card>
                    <CardHeader title="Assigned courses" description="Courses the whole class works through." />
                    <TableWrapper>
                        <thead>
                            <tr>
                                <Th>Course</Th>
                                <Th>Assigned</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignedCourses.map((row) => (
                                <Tr key={row.id}>
                                    <Td className="font-medium text-zinc-900">{row.title ?? `Course #${row.course_id}`}</Td>
                                    <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(row.assigned_at)}</Td>
                                </Tr>
                            ))}
                        </tbody>
                    </TableWrapper>
                </Card>
            ) : null}

            <Card>
                <CardHeader
                    title="Announcements"
                    description="Publishing notifies every active class member through their Cognita notifications."
                />
                <CardBody>
                    {capabilities.can_announce ? <AnnouncementForm classId={classSummary.id} /> : null}
                </CardBody>

                {announcements.length === 0 ? (
                    <EmptyState title="No announcements yet" body="The first announcement you publish appears here." />
                ) : (
                    <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
                        {announcements.map((announcement) => (
                            <li key={announcement.id} className="px-5 py-4">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="text-sm font-medium text-zinc-900">{announcement.title}</p>
                                    <p className="meta">{formatDateTime(announcement.published_at)}</p>
                                </div>
                                <p className="mt-1 max-w-[80ch] text-sm whitespace-pre-line text-zinc-600">
                                    {announcement.body}
                                </p>
                                {announcement.instructor ? (
                                    <p className="meta mt-1">Published by {announcement.instructor}</p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.2fr]">
                <Card>
                    <CardHeader title="Invite a student" description="Records an invitation for this class." />
                    <CardBody>
                        {capabilities.can_invite ? <InvitationForm classId={classSummary.id} /> : null}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader
                        title="AI briefing"
                        description="A short summary of this class with suggested interventions, generated from the class figures above."
                    />
                    <CardBody>
                        {briefing === undefined ? (
                            <BriefingSkeleton />
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="max-w-[70ch] text-sm leading-relaxed text-zinc-700">{briefing.summary}</p>
                                    <Badge tone={briefing.engine === 'ai' ? 'accent' : 'neutral'}>
                                        {briefing.engine === 'ai' ? 'ai engine' : 'rule based'}
                                    </Badge>
                                </div>

                                {briefing.suggested_interventions.length > 0 ? (
                                    <div>
                                        <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                                            Suggested interventions
                                        </p>
                                        <ul className="mt-2 space-y-1.5">
                                            {briefing.suggested_interventions.map((intervention) => (
                                                <li key={intervention} className="flex gap-2 text-sm text-zinc-700">
                                                    <span
                                                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="max-w-[70ch]">{intervention}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </>
    );
}

function BriefingSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <p className="meta">Preparing briefing</p>
            <div className="mt-3 animate-pulse space-y-2">
                <div className="h-3 w-11/12 rounded bg-zinc-100" />
                <div className="h-3 w-9/12 rounded bg-zinc-100" />
                <div className="h-3 w-10/12 rounded bg-zinc-100" />
            </div>
            <div className="mt-5 animate-pulse space-y-2">
                <div className="h-3 w-8/12 rounded bg-zinc-100" />
                <div className="h-3 w-7/12 rounded bg-zinc-100" />
            </div>
        </div>
    );
}

function AssignCourseForm({ classId, courses }: { classId: number; courses: CourseOption[] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        course_id: '',
        due_at: '',
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(instructor.classes.courses.store.url(classId), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <Field label="Course" htmlFor="assign-course" required error={errors.course_id}>
                <select
                    id="assign-course"
                    className={selectClass}
                    value={data.course_id}
                    onChange={(event) => setData('course_id', event.target.value)}
                    required
                >
                    <option value="">Choose a course</option>
                    {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.title}
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Due date" htmlFor="assign-course-due" hint="Optional." error={errors.due_at}>
                <input
                    id="assign-course-due"
                    type="date"
                    className={inputClass}
                    value={data.due_at}
                    onChange={(event) => setData('due_at', event.target.value)}
                />
            </Field>

            <div className="form-footer">
                <button type="submit" className="btn btn-primary" disabled={processing}>
                    {processing ? 'Assigning course' : 'Assign course'}
                </button>
            </div>
        </form>
    );
}

function AssignLessonForm({
    classId,
    students,
    lessonOptions,
}: {
    classId: number;
    students: RosterRow[];
    lessonOptions: LessonOptionGroup[];
}) {
    const [courseId, setCourseId] = useState<string>(String(lessonOptions[0]?.course_id ?? ''));
    const { data, setData, post, processing, errors, reset } = useForm({
        student_id: '',
        lesson_id: '',
        due_at: '',
    });

    const activeGroup = lessonOptions.find((group) => String(group.course_id) === courseId) ?? null;

    function submit(event: React.FormEvent) {
        event.preventDefault();

        if (data.student_id === '' || data.lesson_id === '') {
            return;
        }

        post(
            instructor.classes.students.lessons.store.url({ class: classId, student: Number(data.student_id) }),
            {
                preserveScroll: true,
                onSuccess: () => reset('lesson_id', 'due_at'),
            },
        );
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <Field label="Student" htmlFor="assign-lesson-student" required error={errors.student_id}>
                <select
                    id="assign-lesson-student"
                    className={selectClass}
                    value={data.student_id}
                    onChange={(event) => setData('student_id', event.target.value)}
                    required
                >
                    <option value="">Choose a student</option>
                    {students.map((student) => (
                        <option key={student.id} value={student.id}>
                            {student.display_label}
                            {student.at_risk ? ' (at risk)' : ''}
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Course" htmlFor="assign-lesson-course" hint="Narrows the lesson list below.">
                <select
                    id="assign-lesson-course"
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

            <Field label="Lesson" htmlFor="assign-lesson-lesson" required error={errors.lesson_id}>
                <select
                    id="assign-lesson-lesson"
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

            <Field label="Due date" htmlFor="assign-lesson-due" hint="Optional." error={errors.due_at}>
                <input
                    id="assign-lesson-due"
                    type="date"
                    className={inputClass}
                    value={data.due_at}
                    onChange={(event) => setData('due_at', event.target.value)}
                />
            </Field>

            <div className="form-footer">
                <button type="submit" className="btn btn-secondary" disabled={processing}>
                    {processing ? 'Assigning lesson' : 'Assign lesson'}
                </button>
            </div>
        </form>
    );
}

function AnnouncementForm({ classId }: { classId: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        body: '',
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(instructor.classes.announcements.store.url(classId), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <Field label="Title" htmlFor="announcement-title" required error={errors.title}>
                <input
                    id="announcement-title"
                    type="text"
                    className={inputClass}
                    maxLength={255}
                    value={data.title}
                    onChange={(event) => setData('title', event.target.value)}
                    required
                />
            </Field>

            <Field label="Body" htmlFor="announcement-body" required error={errors.body} hint="Up to 5000 characters.">
                <textarea
                    id="announcement-body"
                    className={inputClass}
                    rows={4}
                    maxLength={5000}
                    value={data.body}
                    onChange={(event) => setData('body', event.target.value)}
                    required
                />
            </Field>

            <div className="form-footer">
                <button type="submit" className="btn btn-primary" disabled={processing}>
                    {processing ? 'Publishing' : 'Publish announcement'}
                </button>
            </div>
        </form>
    );
}

function InvitationForm({ classId }: { classId: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(instructor.classes.invitations.store.url(classId), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <Field
                label="Student email"
                htmlFor="invitation-email"
                required
                error={errors.email}
                hint="The console records the invitation only. Delivery stays with the Cognita API."
            >
                <input
                    id="invitation-email"
                    type="email"
                    className={inputClass}
                    value={data.email}
                    onChange={(event) => setData('email', event.target.value)}
                    required
                />
            </Field>

            <div className="form-footer">
                <button type="submit" className="btn btn-secondary" disabled={processing}>
                    {processing ? 'Recording invitation' : 'Invite student'}
                </button>
            </div>
        </form>
    );
}
