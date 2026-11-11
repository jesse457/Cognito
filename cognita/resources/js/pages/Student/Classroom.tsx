import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarCheck,
    Clock,
    FilePdf,
    Microphone,
    PenNib,
    Users,
} from '@phosphor-icons/react';
import EmptyState from '@/components/ui/EmptyState';
import KeyChip from '@/components/ui/KeyChip';
import Stat from '@/components/ui/Stat';
import { routes } from '@/lib/routes';
import { cn, formatBytes, pluralize } from '@/lib/utils';

interface ClassDetailProps {
    classroom: {
        id: number;
        name: string;
        join_code: string;
        course: string | null;
        instructor: string | null;
        members: number;
        live: boolean;
        call_url: string;
        board: {
            surface: string;
            students_can_annotate: boolean;
            has_document: boolean;
        };
        class_days: number;
    };
    summary: {
        sessions: number;
        seconds: number;
        days: number;
        last_on: string | null;
        time_in_class: string;
        last_attended: string;
    };
    recent: Array<{ id: number; when: string; duration: string; live: boolean }>;
    materials: Array<{ id: number; name: string; pages: number; size: number; added: string; url: string }>;
}

export default function StudentClassroom({ classroom, summary, recent, materials }: ClassDetailProps) {
    return (
        <>
            <Head title={classroom.name} />

            <nav className="flex items-center gap-1.5 text-xs text-ink-muted" aria-label="Breadcrumb">
                <Link href={routes.student.classrooms} className="inline-flex items-center gap-1 hover:text-ink">
                    <ArrowLeft size={13} aria-hidden="true" />
                    My classes
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-ink">{classroom.name}</span>
            </nav>

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="eyebrow">{classroom.course ?? 'Class'}</p>
                    <h1 className="page-title mt-1.5 truncate">{classroom.name}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                            Class key
                            <KeyChip code={classroom.join_code} compact />
                        </span>
                        <span className="chip chip-neutral">
                            <Users size={13} aria-hidden="true" />
                            {pluralize(classroom.members, 'member')}
                        </span>
                        {classroom.live ? (
                            <span className="chip chip-live">
                                <span className="live-dot" aria-hidden="true" />
                                Live now
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link href={routes.student.classrooms} className="btn btn-outline">
                        All classes
                    </Link>
                    <Link
                        href={classroom.call_url}
                        className={cn('btn', classroom.live ? 'btn-primary' : 'btn-outline')}
                    >
                        <Microphone size={16} weight="duotone" aria-hidden="true" />
                        {classroom.live ? 'Join live call' : 'Open call'}
                    </Link>
                </div>
            </header>

            <section aria-label="Your attendance at a glance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Sessions" value={summary.sessions} hint="call joins recorded" icon={Microphone} />
                <Stat label="Time in class" value={summary.time_in_class} hint="across all calls" icon={Clock} />
                <Stat label="Days attended" value={summary.days} hint="days with a call" icon={CalendarCheck} />
                <Stat
                    label="Class has met"
                    value={pluralize(classroom.class_days, 'day')}
                    hint="days with any attendance"
                    icon={BookOpen}
                />
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-6">
                    <section className="card" aria-labelledby="recent-heading">
                        <div className="card-head">
                            <div>
                                <h2 id="recent-heading" className="section-title">
                                    Your sessions in this class
                                </h2>
                                <p className="meta mt-0.5">{summary.last_attended}.</p>
                            </div>
                            <span className="chip chip-neutral">{pluralize(summary.sessions, 'session')}</span>
                        </div>

                        {recent.length === 0 ? (
                            <EmptyState
                                title="No sessions yet"
                                body="Your attendance starts by itself when you join this class's call."
                                action={
                                    <Link href={classroom.call_url} className="btn btn-primary">
                                        Open the call
                                    </Link>
                                }
                            />
                        ) : (
                            <ul className="divide-y divide-line">
                                {recent.map((session) => (
                                    <li key={session.id} className="flex items-center gap-3 px-5 py-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
                                            <Microphone size={15} weight="duotone" aria-hidden="true" />
                                        </span>
                                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink tabular">
                                            {session.when}
                                        </p>
                                        {session.live ? (
                                            <span className="chip chip-live shrink-0">
                                                <span className="live-dot" aria-hidden="true" />
                                                In the call
                                            </span>
                                        ) : (
                                            <span className="text-xs text-ink-muted tabular">{session.duration}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="card" aria-labelledby="materials-heading">
                        <div className="card-head">
                            <div>
                                <h2 id="materials-heading" className="section-title">
                                    Class materials
                                </h2>
                                <p className="meta mt-0.5">PDFs your instructor attached to this class.</p>
                            </div>
                            <span className="chip chip-neutral">{pluralize(materials.length, 'file')}</span>
                        </div>

                        {materials.length === 0 ? (
                            <EmptyState
                                title="No materials yet"
                                body="When your instructor presents a PDF in class, it stays in this library for later."
                            />
                        ) : (
                            <ul className="divide-y divide-line">
                                {materials.map((material) => (
                                    <li key={material.id} className="flex items-center gap-3 px-5 py-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                                            <FilePdf size={16} weight="duotone" aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <a
                                                href={material.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block truncate text-sm font-medium text-ink hover:text-brand"
                                            >
                                                {material.name}
                                            </a>
                                            <p className="text-xs text-ink-muted">
                                                {pluralize(material.pages, 'page')} · {formatBytes(material.size)} · added{' '}
                                                {material.added}
                                            </p>
                                        </div>
                                        <a
                                            href={material.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-quiet btn-sm shrink-0"
                                        >
                                            Open
                                            <ArrowRight size={13} weight="bold" aria-hidden="true" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <aside className="flex flex-col gap-4 lg:sticky lg:top-24" aria-label="Class information">
                    <section className="card p-5">
                        <h2 className="section-title">About this class</h2>
                        <dl className="mt-3 flex flex-col gap-2.5 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-ink-muted">Instructor</dt>
                                <dd className="text-right font-medium text-ink">{classroom.instructor ?? '—'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-ink-muted">Course</dt>
                                <dd className="text-right font-medium text-ink">{classroom.course ?? 'No course'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-ink-muted">Class size</dt>
                                <dd className="text-right font-medium text-ink tabular">{classroom.members}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-ink-muted">Last attended</dt>
                                <dd className="text-right font-medium text-ink">{summary.last_attended}</dd>
                            </div>
                        </dl>

                        <div className="mt-4 border-t border-line pt-4">
                            <p className="meta">Class key</p>
                            <div className="mt-1.5">
                                <KeyChip code={classroom.join_code} />
                            </div>
                            <p className="hint">Share this only with classmates. Your instructor can rotate it.</p>
                        </div>
                    </section>

                    <section className="card p-5">
                        <h2 className="section-title">Board</h2>
                        <div className="mt-3 flex items-start gap-3 rounded-xl border border-line bg-surface-sunken/60 p-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                                <PenNib size={16} weight="duotone" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-ink">
                                    {classroom.board.surface === 'pdf' ? 'A PDF is on the board' : 'Blank canvas'}
                                </p>
                                <p className="mt-0.5 text-xs text-ink-muted">
                                    {classroom.board.students_can_annotate
                                        ? 'Students can draw while the room is live.'
                                        : 'The instructor has the pen. You can watch the board live.'}
                                </p>
                            </div>
                        </div>
                        <p className="hint">
                            The board lives with the call. Join the room to see what the class is working on.
                        </p>
                    </section>
                </aside>
            </div>
        </>
    );
}
