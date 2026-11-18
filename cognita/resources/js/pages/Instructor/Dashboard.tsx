import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Books,
    CalendarCheck,
    ChalkboardTeacher,
    ClockCounterClockwise,
    GraduationCap,
    Key,
    Microphone,
    Plus,
    Users,
} from '@phosphor-icons/react';
import { useState } from 'react';
import NewClassModal from '@/components/instructor/NewClassModal';
import ActivityFeed from '@/components/ui/ActivityFeed';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import KeyChip from '@/components/ui/KeyChip';
import Stat from '@/components/ui/Stat';
import LiveChip from '@/components/ui/LiveChip';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';
import type { ActivityEntry, TeachingClassroom, TeachingCourse, TeachingStats } from '@/types';
import LearningPanel, { type LearningView } from '@/components/dashboard/LearningPanel';

interface InstructorDashboardProps {
    learning: LearningView;
    stats: TeachingStats;
    courses: TeachingCourse[];
    classrooms: TeachingClassroom[];
    activity: ActivityEntry[];
}

/**
 * The instructor dashboard.
 *
 * Reading order follows the questions an instructor actually has: what is live
 * (the KPI row and the live strip), what I teach (class and course tiles, each
 * with its key, its roster and its way into the room), and what happened lately
 * (the activity feed in the side column).
 */
export default function InstructorDashboard({ learning, stats, courses, classrooms, activity }: InstructorDashboardProps) {
    const [creating, setCreating] = useState(false);

    const live = classrooms.filter((classroom) => classroom.live);
    const nextClass = live[0] ?? classrooms[0] ?? null;

    return (
        <>
            <Head title="Teaching" />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">Teaching</h1>
                    <p className="page-sub">
                        One room and one board per class. Students join with the class key, and attendance records itself
                        while they are in the call.
                    </p>
                </div>
                <Button variant="primary" onClick={() => setCreating(true)}>
                    <Plus size={16} weight="bold" aria-hidden="true" />
                    New class
                </Button>
            </header>

            <section aria-label="Teaching at a glance" className="kpi-row grid-cols-2 xl:grid-cols-4">
                <Stat
                    label="Rooms open"
                    value={stats.live_classes}
                    hint={
                        stats.live_classes === 0
                            ? 'Nothing is live right now'
                            : `of ${pluralize(stats.classes, 'class')}`
                    }
                    tone={stats.live_classes > 0 ? 'live' : 'neutral'}
                    icon={Microphone}
                />
                <Stat
                    label="In class now"
                    value={stats.in_call}
                    hint={pluralize(stats.in_call, 'student') + ' in a call'}
                    icon={Users}
                />
                <Stat
                    label="Students enrolled"
                    value={stats.students}
                    hint={`across ${pluralize(stats.classes, 'class')}`}
                    icon={GraduationCap}
                />
                <Stat
                    label="Rooms held"
                    value={stats.rooms_this_week}
                    hint="opened in the last 7 days"
                    icon={ClockCounterClockwise}
                />
            </section>

            <LearningPanel learning={learning} title="Course progress and tasks" />

            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-10">
                    <section aria-labelledby="live-heading" className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 id="live-heading" className="section-title">
                                Live now
                            </h2>
                            <p className="meta">A room exists only while somebody is in it.</p>
                        </div>

                        {live.length === 0 ? (
                            <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                                <div className="min-w-0">
                                    <p className="text-[13.5px] font-medium text-ink">No room is open</p>
                                    <p className="meta mt-0.5">
                                        Open one when you are ready. Students see it on their dashboard the moment it is
                                        live.
                                    </p>
                                </div>
                                {nextClass === null ? null : (
                                    <Link href={nextClass.call_url} className="btn btn-outline btn-sm">
                                        <Microphone size={15} aria-hidden="true" />
                                        Open {nextClass.name}
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <ul className="card divide-y divide-line overflow-hidden">
                                {live.map((classroom) => (
                                    <li key={classroom.id} className="flex items-center gap-3 px-5 py-3.5">
                                        <span className="live-dot shrink-0 text-live" aria-hidden="true" />

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13.5px] font-medium text-ink">{classroom.name}</p>
                                            <p className="meta mt-0.5 truncate">
                                                {classroom.course ?? 'No course'} · {pluralize(classroom.in_call, 'student')}{' '}
                                                in the call
                                            </p>
                                        </div>

                                        <Link href={classroom.call_url} className="btn btn-primary btn-sm shrink-0">
                                            Open call
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="classes-heading" className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 id="classes-heading" className="section-title">
                                Your classes
                            </h2>
                            <Link
                                href={routes.instructor.classrooms}
                                className="flex items-center gap-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
                            >
                                All classes
                                <ArrowRight size={13} weight="bold" aria-hidden="true" />
                            </Link>
                        </div>

                        {classrooms.length === 0 ? (
                            <div className="card">
                                <EmptyState
                                    title="No classes yet"
                                    body="A class gets a key the moment you create it. Students type that key to join the room, and the board is already attached."
                                    action={
                                        <Button variant="primary" onClick={() => setCreating(true)}>
                                            <Plus size={16} weight="bold" aria-hidden="true" />
                                            Create your first class
                                        </Button>
                                    }
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
                                                    {classroom.course ?? 'No course'} · {pluralize(classroom.members, 'student')}
                                                </p>
                                            </div>

                                            {classroom.live ? (
                                                <LiveChip label="Live" />
                                            ) : null}
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <KeyChip code={classroom.join_code} compact />
                                            <p className="meta flex items-center gap-1.5">
                                                <ClockCounterClockwise size={13} aria-hidden="true" />
                                                {classroom.next_session
                                                    ? `Next ${classroom.next_session.until}`
                                                    : classroom.last_session}
                                            </p>
                                        </div>

                                        <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
                                            <Link href={classroom.call_url} className="btn btn-primary btn-sm">
                                                <Microphone size={15} aria-hidden="true" />
                                                {classroom.live ? 'Join call' : 'Start call'}
                                            </Link>
                                            <Link href={classroom.attendance_url} className="btn btn-quiet btn-sm">
                                                <CalendarCheck size={14} aria-hidden="true" />
                                                Attendance
                                            </Link>
                                            <Link href={classroom.class_url} className="btn btn-quiet btn-sm">
                                                Details
                                                <ArrowRight size={14} weight="bold" aria-hidden="true" />
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="courses-heading" className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 id="courses-heading" className="section-title">
                                Your courses
                            </h2>
                            <Link
                                href={routes.instructor.courses}
                                className="flex items-center gap-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
                            >
                                Edit courses
                                <ArrowRight size={13} weight="bold" aria-hidden="true" />
                            </Link>
                        </div>

                        {courses.length === 0 ? (
                            <div className="card">
                                <EmptyState
                                    title="No courses yet"
                                    body="Courses group your classes. A course only needs a title and an optional description, and classes work fine without one."
                                    action={
                                        <Link href={routes.instructor.courses} className="btn btn-primary">
                                            Create a course
                                        </Link>
                                    }
                                />
                            </div>
                        ) : (
                            <ul className="card divide-y divide-line overflow-hidden">
                                {courses.map((course) => (
                                    <li key={course.id} className="flex items-start gap-3 px-4 py-3">
                                        <ChalkboardTeacher
                                            size={16}
                                            className="mt-0.5 shrink-0 text-ink-soft"
                                            aria-hidden="true"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={routes.instructor.course(course.id)}
                                                className="block truncate text-[13.5px] font-medium text-ink transition-colors hover:text-brand"
                                            >
                                                {course.title}
                                            </Link>
                                            <p className="meta mt-0.5 line-clamp-1">
                                                {course.description ?? 'No description yet.'}
                                            </p>
                                        </div>
                                        {course.is_paid ? (
                                            <span className="chip chip-brand shrink-0">Paid · {course.price_label}</span>
                                        ) : null}
                                        <span className="chip chip-neutral shrink-0">
                                            {pluralize(course.classrooms_count, 'class')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {stats.unassigned > 0 ? (
                            <p className="meta flex items-center gap-1.5">
                                <Key size={13} aria-hidden="true" />
                                {pluralize(stats.unassigned, 'class')} not attached to a course yet.
                            </p>
                        ) : null}
                    </section>
                </div>

                <aside className="flex flex-col gap-4 lg:sticky lg:top-20" aria-label="Activity and shortcuts">
                    <div className="card overflow-hidden">
                        <div className="card-head">
                            <div>
                                <h2 className="section-title">Recent activity</h2>
                                <p className="meta mt-0.5">Joins and calls, recorded automatically.</p>
                            </div>
                        </div>

                        {activity.length === 0 ? (
                            <EmptyState
                                title="Nothing yet"
                                body="New students and new calls appear here as they happen — no register to keep."
                            />
                        ) : (
                            <ActivityFeed items={activity} />
                        )}
                    </div>

                    <div className="card overflow-hidden">
                        <div className="card-head">
                            <h2 className="section-title">Shortcuts</h2>
                        </div>
                        <ul className="divide-y divide-line">
                            <li>
                                <Link
                                    href={routes.instructor.students}
                                    className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-surface-sunken/60"
                                >
                                    <Users size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">Students across your classes</span>
                                    <ArrowRight size={13} weight="bold" className="text-ink-soft" aria-hidden="true" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={routes.instructor.attendance}
                                    className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-surface-sunken/60"
                                >
                                    <CalendarCheck size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">Attendance overview</span>
                                    <ArrowRight size={13} weight="bold" className="text-ink-soft" aria-hidden="true" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={routes.instructor.courses}
                                    className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-surface-sunken/60"
                                >
                                    <Books size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">Courses and descriptions</span>
                                    <ArrowRight size={13} weight="bold" className="text-ink-soft" aria-hidden="true" />
                                </Link>
                            </li>
                            {nextClass === null ? null : (
                                <li>
                                    <Link
                                        href={nextClass.attendance_url}
                                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-surface-sunken/60"
                                    >
                                        <CalendarCheck size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
                                        <span className="min-w-0 flex-1 truncate">Attendance for {nextClass.name}</span>
                                        <ArrowRight size={13} weight="bold" className="text-ink-soft" aria-hidden="true" />
                                    </Link>
                                </li>
                            )}
                            {nextClass === null ? null : (
                                <li>
                                    <Link
                                        href={nextClass.class_url}
                                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-surface-sunken/60"
                                    >
                                        <ChalkboardTeacher size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
                                        <span className="min-w-0 flex-1 truncate">Roster and board of {nextClass.name}</span>
                                        <ArrowRight size={13} weight="bold" className="text-ink-soft" aria-hidden="true" />
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className="card p-4">
                        <p className="text-[13px] font-medium text-ink">How a class runs</p>
                        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 text-[12px] leading-relaxed text-ink-muted">
                            <li>Create a class and read out its key.</li>
                            <li>Students type the key once, then see the class here and on their dashboard.</li>
                            <li>Open the room when the lesson starts — attendance and the board follow the call.</li>
                        </ol>
                    </div>
                </aside>
            </div>

            <NewClassModal open={creating} courses={courses} onClose={() => setCreating(false)} />
        </>
    );
}
