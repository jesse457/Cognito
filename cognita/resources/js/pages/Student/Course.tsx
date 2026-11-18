import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Article,
    CalendarBlank,
    CheckCircle,
    Circle,
    Exam,
    LockKey,
    PlayCircle,
    VideoCamera,
} from '@phosphor-icons/react';
import EmptyState from '@/components/ui/EmptyState';
import { routes } from '@/lib/routes';
import { formatMoment, pluralize } from '@/lib/utils';
import type {
    StudentCourseSessionView as SessionRow,
    StudentLessonRow as LessonRow,
    StudentSectionView as SectionRow,
} from '@/types';

interface CourseProps {
    enrolled: boolean;
    owned: boolean;
    can_access: boolean;
    access_reason: 'enroll' | 'payment' | null;
    payment: {
        required: boolean;
        price_label: string | null;
        instructions: string | null;
        payment_url: string | null;
        status: string | null;
    };
    course: {
        id: number;
        title: string;
        description: string | null;
        instructor: string | null;
        is_paid: boolean;
        price_label: string | null;
        url: string;
    };
    progress: {
        completed: number;
        total: number;
        percent: number;
        continue_url: string | null;
    };
    sections: SectionRow[];
    sessions: SessionRow[];
}

const LESSON_ICONS: Record<string, typeof PlayCircle> = {
    video: PlayCircle,
    article: Article,
    quiz: Exam,
};

export default function StudentCourse({
    can_access: canAccess,
    access_reason: accessReason,
    payment,
    course,
    progress,
    sections,
    sessions,
}: CourseProps) {
    return (
        <>
            <Head title={course.title} />

            <nav className="flex items-center gap-1.5 text-xs text-ink-muted" aria-label="Breadcrumb">
                <Link href={routes.student.courses} className="hover:text-ink">
                    Courses
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-ink">{course.title}</span>
            </nav>

            {!canAccess ? (
                <div className="rounded-xl border border-warn/30 bg-warn-soft/50 p-4 text-[13px] text-ink-muted">
                    <div className="flex items-center gap-2 font-medium text-ink">
                        <LockKey size={15} aria-hidden="true" />
                        {accessReason === 'payment' ? 'Payment required to open this course' : 'Join the class to open this course'}
                    </div>
                    <p className="mt-1.5 max-w-[72ch] leading-relaxed">
                        {accessReason === 'payment'
                            ? `Lessons, notes, videos and documents unlock once your instructor confirms your payment of ${payment.price_label ?? 'this course'}.`
                            : 'Lessons, notes, videos and documents are available to students who joined a class for this course. Ask your instructor for the class key.'}
                    </p>
                    {payment.required && payment.instructions ? (
                        <p className="mt-2 rounded-lg bg-surface/70 p-2.5 text-[12.5px]">{payment.instructions}</p>
                    ) : null}
                    {payment.payment_url ? (
                        <a href={payment.payment_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm mt-3">
                            Open the payment page
                        </a>
                    ) : null}
                    {accessReason === 'payment' ? (
                        <p className="meta mt-2">
                            {payment.status === 'pending'
                                ? 'Your payment is awaiting the instructor’s confirmation.'
                                : 'Report the payment from your class page, then wait for confirmation.'}
                        </p>
                    ) : null}
                </div>
            ) : null}

            <header className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                    <p className="eyebrow">{course.instructor ?? 'Self-paced course'}</p>
                    <h1 className="page-title mt-1.5">{course.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {course.is_paid ? (
                            <span className="chip chip-brand">
                                <LockKey size={12} aria-hidden="true" />
                                Paid · {course.price_label}
                            </span>
                        ) : (
                            <span className="chip chip-neutral">Included with your class</span>
                        )}
                    </div>
                    <p className="page-sub mt-2 max-w-[70ch]">
                        {course.description ?? 'Work through the lessons below at your own pace.'}
                    </p>
                </div>

                {canAccess ? (
                    <div className="card p-4">
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="text-[12.5px] font-medium text-ink">Your progress</p>
                            <p className="text-[13px] tabular-nums text-ink-muted">
                                {progress.completed} / {progress.total}
                            </p>
                        </div>
                        <div
                            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                            role="progressbar"
                            aria-valuenow={progress.percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Course completion"
                        >
                            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress.percent}%` }} />
                        </div>
                        <p className="meta mt-2">{progress.percent}% complete</p>
                        {progress.continue_url ? (
                            <Link href={progress.continue_url} className="btn btn-primary mt-3 w-full justify-center">
                                {progress.completed > 0 ? 'Continue learning' : 'Start the course'}
                                <ArrowRight size={15} weight="bold" aria-hidden="true" />
                            </Link>
                        ) : progress.total > 0 ? (
                            <p className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand-soft px-3 py-2 text-[13px] font-medium text-brand">
                                <CheckCircle size={15} weight="fill" aria-hidden="true" />
                                Course complete
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <div className="card flex flex-col items-center gap-2 p-4 text-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-sunken text-ink-soft">
                            <LockKey size={17} aria-hidden="true" />
                        </span>
                        <p className="text-[12.5px] font-medium text-ink">Course content is locked</p>
                        <p className="meta">Membership and payment are checked before any lesson opens.</p>
                    </div>
                )}
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section aria-labelledby="outline-heading" className="flex flex-col gap-4">
                    <h2 id="outline-heading" className="section-title">
                        Course outline
                    </h2>

                    {sections.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                title={canAccess ? 'No lessons yet' : 'The outline is locked'}
                                body={canAccess
                                    ? 'Your instructor has not published the course outline yet.'
                                    : 'Join the class and, for a paid course, have your payment confirmed to see the lessons.'}
                                action={
                                    <Link href={routes.student.home} className="btn btn-outline">
                                        <ArrowLeft size={15} aria-hidden="true" />
                                        Back to my classes
                                    </Link>
                                }
                            />
                        </div>
                    ) : (
                        <ol className="flex flex-col gap-4">
                            {sections.map((section, index) => {
                                const completed = section.lessons.filter((lesson) => lesson.completed).length;

                                return (
                                    <li key={section.id} className="card overflow-hidden">
                                        <div className="border-b border-line px-4 py-3.5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="eyebrow">Section {index + 1}</p>
                                                    <h3 className="mt-1 text-[15px] font-semibold">{section.title}</h3>
                                                    {section.description ? (
                                                        <p className="mt-1 max-w-[65ch] text-[13px] leading-relaxed text-ink-muted">
                                                            {section.description}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <span className="meta shrink-0">
                                                    {completed}/{section.lessons.length}
                                                </span>
                                            </div>
                                        </div>

                                        {section.lessons.length === 0 ? (
                                            <p className="px-4 py-4 text-[13px] text-ink-muted">
                                                No published lessons in this section.
                                            </p>
                                        ) : (
                                            <ul className="divide-y divide-line">
                                                {section.lessons.map((lesson) => {
                                                    const Glyph = LESSON_ICONS[lesson.type] ?? Article;

                                                    return (
                                                        <li key={lesson.id}>
                                                            <Link
                                                                href={lesson.url}
                                                                className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-sunken/60"
                                                            >
                                                                <span
                                                                    className={
                                                                        lesson.completed
                                                                            ? 'text-brand'
                                                                            : 'text-ink-soft'
                                                                    }
                                                                >
                                                                    {lesson.completed ? (
                                                                        <CheckCircle size={19} weight="fill" aria-hidden="true" />
                                                                    ) : (
                                                                        <Circle size={19} aria-hidden="true" />
                                                                    )}
                                                                </span>
                                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
                                                                    <Glyph size={16} aria-hidden="true" />
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-[13.5px] font-medium">
                                                                        {lesson.title}
                                                                    </p>
                                                                    <p className="meta mt-0.5">
                                                                        {lesson.type_label}
                                                                        {lesson.duration_minutes
                                                                            ? ` · ${lesson.duration_minutes} min`
                                                                            : ''}
                                                                        {lesson.progress === 'in_progress' && !lesson.completed
                                                                            ? ' · In progress'
                                                                            : ''}
                                                                    </p>
                                                                </div>
                                                                <ArrowRight size={15} className="shrink-0 text-ink-soft" aria-hidden="true" />
                                                            </Link>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>

                <aside className="flex flex-col gap-4">
                    <section className="card" aria-labelledby="sessions-heading">
                        <div className="card-head">
                            <h2 id="sessions-heading" className="section-title">
                                Live sessions
                            </h2>
                        </div>
                        {sessions.length === 0 ? (
                            <p className="px-4 py-4 text-[13px] text-ink-muted">No live sessions scheduled.</p>
                        ) : (
                            <ul className="divide-y divide-line">
                                {sessions.map((session) => (
                                    <li key={session.id} className="px-4 py-3">
                                        <p className="flex items-center gap-1.5 text-[13px] font-medium">
                                            <VideoCamera size={14} className="text-ink-soft" aria-hidden="true" />
                                            {session.title}
                                        </p>
                                        <p className="meta mt-1 flex items-center gap-1">
                                            <CalendarBlank size={12} aria-hidden="true" />
                                            {formatMoment(session.starts_at) ?? 'Time to be announced'}
                                        </p>
                                        {session.classroom ? (
                                            <p className="meta mt-0.5">Class: {session.classroom}</p>
                                        ) : null}
                                        {session.lesson ? (
                                            <p className="meta mt-0.5">Lesson: {session.lesson}</p>
                                        ) : null}
                                        {session.description ? (
                                            <p className="mt-1 max-w-[60ch] text-[12.5px] leading-relaxed text-ink-muted">
                                                {session.description}
                                            </p>
                                        ) : null}
                                        <Link
                                            href={session.join_url}
                                            className="btn btn-outline btn-sm mt-2"
                                        >
                                            {session.state === 'live' ? 'Join now' : 'Open class room'}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <p className="meta">
                        {pluralize(sections.length, 'section')} ·{' '}
                        {pluralize(
                            sections.reduce((count, section) => count + section.lessons.length, 0),
                            'lesson',
                        )}
                    </p>
                </aside>
            </div>
        </>
    );
}
