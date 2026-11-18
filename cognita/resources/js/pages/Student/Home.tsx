import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Broadcast,
    CalendarCheck,
    Clock,
    ClockCounterClockwise,
    FilePdf,
    GraduationCap,
    Key,
    LockSimple,
    Microphone,
    Notebook,
} from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import KeyChip from '@/components/ui/KeyChip';
import Stat from '@/components/ui/Stat';
import LiveChip from '@/components/ui/LiveChip';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';
import type { EnrolledCourse, StudentClassroom, StudySession, StudyStats } from '@/types';
import LearningPanel, { type LearningView } from '@/components/dashboard/LearningPanel';

interface StudentHomeProps {
    learning: LearningView;
    stats: StudyStats;
    courses: EnrolledCourse[];
    classrooms: StudentClassroom[];
    recent: StudySession[];
}

/**
 * The student dashboard.
 *
 * The key form comes first because joining a class is the one thing a student
 * arrives here to do. Everything after it answers "where do I go now": rooms
 * that are live this minute, the classes already joined, the courses they add
 * up to, and the last few calls the student was in — each one a click away from
 * the room it belongs to.
 */
export default function StudentHome({ learning, stats, courses, classrooms, recent }: StudentHomeProps) {
    const form = useForm({ key: '' });

    const live = classrooms.filter((classroom) => classroom.live);

    function submit(event: FormEvent): void {
        event.preventDefault();
        form.post(routes.join, { onFinish: () => form.reset('key') });
    }

    return (
        <>
            <Head title="My classes" />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">My classes</h1>
                    <p className="page-sub">
                        Every class you joined with a key lives here. Open one to join its group call and the shared
                        board; your attendance is recorded while you are in the call.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href={routes.student.classrooms}
                        className="flex items-center gap-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                        All classes
                        <ArrowRight size={13} weight="bold" aria-hidden="true" />
                    </Link>
                    <Link
                        href={routes.student.attendance}
                        className="flex items-center gap-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                        Attendance
                        <ArrowRight size={13} weight="bold" aria-hidden="true" />
                    </Link>
                </div>
            </header>

            <section aria-label="Your classes at a glance" className="kpi-row grid-cols-2 xl:grid-cols-4">
                <Stat
                    label="Classes"
                    value={stats.classes}
                    hint={
                        stats.courses === 0
                            ? 'Joined with a class key'
                            : `in ${pluralize(stats.courses, 'course')}`
                    }
                    icon={Notebook}
                />
                <Stat
                    label="Live now"
                    value={stats.live}
                    hint={stats.live === 0 ? 'No room is open' : pluralize(stats.live, 'room') + ' open'}
                    tone={stats.live > 0 ? 'live' : 'neutral'}
                    icon={Broadcast}
                />
                <Stat label="Time in class" value={stats.time_in_class} hint="over the last 7 days" icon={Clock} />
                <Stat
                    label="Sessions"
                    value={stats.sessions}
                    hint="calls in the last 30 days"
                    icon={ClockCounterClockwise}
                />
            </section>

            <LearningPanel learning={learning} title="Your progress and tasks" />

            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <aside className="flex flex-col gap-4 lg:order-2 lg:sticky lg:top-20" aria-label="Join and courses">
                    <div className="card p-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                                <Key size={15} aria-hidden="true" />
                            </span>
                            <h2 className="section-title">Join a class</h2>
                        </div>
                        <p className="meta mt-2">Ask your instructor for the six-character key, then type it here.</p>

                        <form onSubmit={submit} className="mt-3.5 flex flex-col gap-3">
                            <label className="label" htmlFor="join-key">
                                Class key
                            </label>
                            <input
                                id="join-key"
                                name="key"
                                value={form.data.key}
                                onChange={(event) => form.setData('key', event.target.value.toUpperCase())}
                                placeholder="PHY101"
                                maxLength={12}
                                autoComplete="off"
                                spellCheck={false}
                                className="input input-key"
                                aria-invalid={Boolean(form.errors.key)}
                            />
                            {form.errors.key ? (
                                <p className="error" role="alert">
                                    {form.errors.key}
                                </p>
                            ) : null}
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={form.processing || form.data.key.trim() === ''}
                                className="w-full"
                            >
                                {form.processing ? 'Joining' : 'Join class'}
                            </Button>
                        </form>
                    </div>

                    <div className="card overflow-hidden">
                        <div className="card-head">
                            <div>
                                <h2 className="section-title">Your courses</h2>
                                <p className="meta mt-0.5">
                                    {stats.courses === 0
                                        ? 'Courses appear when your classes belong to one.'
                                        : `${pluralize(stats.courses, 'course')} through your classes`}
                                </p>
                            </div>
                            <Link
                                href={routes.student.courses}
                                className="flex items-center gap-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
                            >
                                All courses
                                <ArrowRight size={13} weight="bold" aria-hidden="true" />
                            </Link>
                        </div>

                        {courses.length === 0 ? (
                            <EmptyState
                                title="No courses yet"
                                body="A class does not need a course, so this stays empty until yours are grouped."
                            />
                        ) : (
                            <ul className="divide-y divide-line">
                                {courses.map((course) => (
                                    <li key={course.id} className="flex items-start gap-3 px-5 py-3">
                                        <GraduationCap
                                            size={16}
                                            className="mt-0.5 shrink-0 text-ink-soft"
                                            aria-hidden="true"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={routes.community.course(course.id)}
                                                className="block truncate text-[13.5px] font-medium text-ink transition-colors hover:text-brand"
                                            >
                                                {course.title}
                                            </Link>
                                            <p className="text-[12px] text-ink-muted">
                                                {pluralize(course.classes, 'class')} ·{' '}
                                                {pluralize(course.members, 'member')}
                                            </p>
                                        </div>
                                        {course.live ? (
                                            <LiveChip label="Live" />
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="card p-4">
                        <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                            <Microphone size={15} className="text-brand" aria-hidden="true" />
                            When you are in a call
                        </p>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
                            Your attendance starts by itself and closes when you leave. The board belongs to the room:
                            the ink from one call is not kept for the next.
                        </p>
                    </div>
                </aside>

                <div className="flex flex-col gap-10 lg:order-1">
                    {live.length > 0 ? (
                        <section aria-labelledby="live-heading" className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 id="live-heading" className="section-title">
                                    Live now
                                </h2>
                                <p className="meta">
                                    {stats.in_call > 0
                                        ? `${pluralize(stats.in_call, 'person', 'people')} in a call right now`
                                        : 'The room is open'}
                                </p>
                            </div>

                            <ul className="card divide-y divide-line overflow-hidden">
                                {live.map((classroom) => (
                                    <li key={classroom.id} className="flex items-center gap-3 px-5 py-3.5">
                                        <span className="live-dot shrink-0 text-live" aria-hidden="true" />

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13.5px] font-medium text-ink">{classroom.name}</p>
                                            <p className="meta mt-0.5 truncate">
                                                {classroom.instructor ?? 'Instructor'} ·{' '}
                                                {pluralize(classroom.members, 'member')}
                                            </p>
                                        </div>

                                        <Link href={classroom.call_url} className="btn btn-primary btn-sm shrink-0">
                                            {classroom.payment.required && !classroom.payment.can_access
                                                ? 'Pay to join'
                                                : 'Join call'}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    <section aria-labelledby="class-list-heading" className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 id="class-list-heading" className="section-title">
                                Your classroom
                            </h2>
                            <p className="meta">Each class is one group call and one board.</p>
                        </div>

                        {classrooms.length === 0 ? (
                            <div className="card">
                                <EmptyState
                                    title="No classes yet"
                                    body="The key from your instructor is all you need. Type it in Join a class and the class appears here, one click from its room."
                                />
                            </div>
                        ) : (
                            <ul className="grid gap-3 md:grid-cols-2">
                                {classrooms.map((classroom) => (
                                    <li
                                        key={classroom.id}
                                        className={cn(
                                            'card flex flex-col gap-4 p-5 transition hover:border-line-strong',
                                            classroom.live && 'border-live/30',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em]">
                                                    {classroom.name}
                                                </h3>
                                                <p className="meta mt-0.5 truncate">
                                                    {classroom.instructor ?? 'Instructor'} ·{' '}
                                                    {pluralize(classroom.members, 'member')}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                {classroom.live ? <LiveChip label="Live" /> : null}
                                                {classroom.payment.required && !classroom.payment.can_access ? (
                                                    <span className="chip chip-brand">
                                                        <LockSimple size={12} aria-hidden="true" />
                                                        {classroom.payment.price_label}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <p className="meta flex items-center gap-1.5">
                                                <CalendarCheck size={13} aria-hidden="true" />
                                                {classroom.last_attended}
                                            </p>
                                            {classroom.next_session ? (
                                                <>
                                                    <p className="meta flex items-center gap-1.5">
                                                        <ClockCounterClockwise size={13} aria-hidden="true" />
                                                        Next session {classroom.next_session.until}
                                                    </p>
                                                    {classroom.next_session.title ? (
                                                        <p className="meta pl-[20px] font-medium text-ink">
                                                            {classroom.next_session.title}
                                                        </p>
                                                    ) : null}
                                                    {classroom.next_session.description ? (
                                                        <p className="meta line-clamp-2 pl-[20px]">
                                                            {classroom.next_session.description}
                                                        </p>
                                                    ) : null}
                                                    {classroom.next_session.materials.length > 0 ? (
                                                        <ul className="mt-1 flex flex-wrap gap-1.5 pl-[20px]">
                                                            {classroom.next_session.materials.map((material) => (
                                                                <li key={material.id}>
                                                                    <a
                                                                        href={material.url}
                                                                        className="chip chip-neutral transition hover:border-brand hover:text-brand"
                                                                        title={`Download ${material.name}`}
                                                                    >
                                                                        <FilePdf size={12} aria-hidden="true" />
                                                                        {material.name}
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </div>

                                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                                            <KeyChip code={classroom.join_code} compact />
                                            <Link
                                                href={classroom.call_url}
                                                className={cn('btn btn-sm', classroom.live ? 'btn-primary' : 'btn-outline')}
                                            >
                                                <Microphone size={15} aria-hidden="true" />
                                                {classroom.payment.required && !classroom.payment.can_access
                                                    ? 'Pay to join'
                                                    : classroom.live
                                                      ? 'Join call'
                                                      : 'Open call'}
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="recent-heading" className="card overflow-hidden">
                        <div className="card-head">
                            <div>
                                <h2 id="recent-heading" className="section-title">
                                    Your recent sessions
                                </h2>
                                <p className="meta mt-0.5">Recorded automatically while you were in the call.</p>
                            </div>
                        </div>

                        {recent.length === 0 ? (
                            <EmptyState
                                title="No sessions yet"
                                body="Your first call creates the first row here, with the time you joined and how long you stayed."
                            />
                        ) : (
                            <ul className="divide-y divide-line">
                                {recent.map((session) => (
                                    <li key={session.id} className="flex items-center gap-3 px-5 py-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
                                            <Microphone size={14} aria-hidden="true" />
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13.5px] font-medium text-ink">{session.classroom}</p>
                                            <p className="text-[12px] text-ink-muted tabular">{session.when}</p>
                                        </div>

                                        {session.live ? (
                                            <LiveChip label="In the call" />
                                        ) : (
                                            <span className="shrink-0 text-[12px] text-ink-muted tabular">
                                                {session.duration}
                                            </span>
                                        )}

                                        <Link
                                            href={session.href}
                                            className="btn btn-quiet btn-sm shrink-0"
                                            aria-label={`Open the call for ${session.classroom}`}
                                        >
                                            Rejoin
                                            <ArrowRight size={13} weight="bold" aria-hidden="true" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
