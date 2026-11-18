import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarCheck,
    Clock,
    FilePdf,
    LockSimple,
    Microphone,
    PenNib,
    Users,
} from '@phosphor-icons/react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import KeyChip from '@/components/ui/KeyChip';
import Stat from '@/components/ui/Stat';
import LiveChip from '@/components/ui/LiveChip';
import { routes } from '@/lib/routes';
import { cn, formatBytes, formatMoment, formatUntil, pluralize } from '@/lib/utils';
import type { ClassSession, PaymentState, SessionState } from '@/types';

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
            has_document: boolean;
            /** Whether the instructor handed this student the pen. */
            can_draw: boolean;
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
    /** The state of the session this class is in: live, waiting, passed or none. */
    session_state: SessionState;
    sessions: ClassSession[];
    /** Whether the live room is unlocked for this student. */
    payment: PaymentState;
}

export default function StudentClassroom({
    classroom,
    summary,
    recent,
    materials,
    session_state,
    sessions,
    payment,
}: ClassDetailProps) {
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
                            <LiveChip label="Live now" />
                        ) : null}
                        {payment.required ? (
                            payment.can_access ? (
                                <span className="chip chip-live">Paid · live room unlocked</span>
                            ) : (
                                <span className="chip chip-brand">
                                    <LockSimple size={13} aria-hidden="true" />
                                    Payment required · {payment.price_label}
                                </span>
                            )
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link href={routes.student.classrooms} className="btn btn-outline">
                        All classes
                    </Link>
                    <Link
                        href={classroom.call_url}
                        className={cn('btn', session_state === 'live' || session_state === 'waiting' ? 'btn-primary' : 'btn-outline')}
                    >
                        <Microphone size={16} aria-hidden="true" />
                        {payment.required && !payment.can_access
                            ? 'Pay to join'
                            : session_state === 'live'
                              ? 'Join the call'
                              : session_state === 'waiting'
                                ? 'Enter the waiting room'
                                : session_state === 'passed'
                                  ? 'Session ended'
                                  : 'No session yet'}
                    </Link>
                </div>
            </header>

            <section aria-label="Your attendance at a glance" className="kpi-row grid-cols-2 xl:grid-cols-4">
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
                    {payment.required && !payment.can_access ? (
                        <section className="card border-brand/30 bg-brand-soft/25 p-4" aria-labelledby="payment-heading">
                            <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                    <LockSimple size={18} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <h2 id="payment-heading" className="section-title">
                                        The live room is locked
                                    </h2>
                                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                                        This is a paid course. The class key gets you into the class, but the live
                                        room opens only after your instructor confirms your payment of{' '}
                                        <span className="font-semibold text-ink">{payment.price_label}</span>.
                                    </p>
                                    {payment.payment_instructions ? (
                                        <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-muted">
                                            {payment.payment_instructions}
                                        </p>
                                    ) : null}
                                    {payment.status === 'pending' ? (
                                        <p className="mt-2 text-[12.5px] font-medium text-brand">
                                            Payment submitted. Waiting for your instructor to confirm it.
                                        </p>
                                    ) : null}

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {payment.payment_url ? (
                                            <a
                                                href={payment.payment_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-primary btn-sm"
                                            >
                                                Pay {payment.price_label}
                                                <ArrowRight size={14} weight="bold" aria-hidden="true" />
                                            </a>
                                        ) : null}
                                        {payment.submit_url && payment.status !== 'pending' ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    router.post(payment.submit_url!, {}, { preserveScroll: true })
                                                }
                                            >
                                                I have paid
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    <section className="card" aria-labelledby="sessions-heading">
                        <div className="card-head">
                            <div>
                                <h2 id="sessions-heading" className="section-title">
                                    Sessions
                                </h2>
                                <p className="meta mt-0.5">
                                    {session_state === 'waiting'
                                        ? 'A session is scheduled. You can wait in the room from the moment it starts.'
                                        : session_state === 'live'
                                          ? 'The session is open right now.'
                                          : session_state === 'passed'
                                            ? 'The last session has ended. A finished session cannot be entered again.'
                                            : 'Your instructor has not announced a session for this class yet.'}
                                </p>
                            </div>
                        </div>

                        {sessions.length === 0 ? (
                            <EmptyState
                                title="No sessions yet"
                                body="Sessions appear here as soon as your instructor announces them. Only an announced session can be entered."
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
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                            {session.description ? (
                                                <p className="mt-1.5 max-w-[70ch] text-[12.5px] leading-relaxed text-ink-muted">
                                                    {session.description}
                                                </p>
                                            ) : null}
                                            {session.materials.length > 0 ? (
                                                <ul className="mt-1.5 flex flex-wrap gap-2">
                                                    {session.materials.map((material) => (
                                                        <li key={material.id}>
                                                            <a
                                                                href={material.url}
                                                                className="chip chip-neutral transition hover:border-brand hover:text-brand"
                                                                title={`Download ${material.name} (${formatBytes(material.size)})`}
                                                            >
                                                                <FilePdf size={13} aria-hidden="true" />
                                                                {material.name}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                        </div>

                                        {session.state === 'live' ? (
                                            <LiveChip label="Live" />
                                        ) : session.state === 'waiting' ? (
                                            <span className="chip chip-brand">Scheduled</span>
                                        ) : (
                                            <span className="chip chip-neutral">Ended</span>
                                        )}

                                        {session.state === 'live' || session.state === 'waiting' ? (
                                            <Link href={classroom.call_url} className="btn btn-primary btn-sm">
                                                {session.state === 'live' ? 'Join' : 'Enter'}
                                            </Link>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

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
                                    <li key={session.id} className="flex items-center gap-3 px-4 py-2.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
                                            <Microphone size={15} weight="duotone" aria-hidden="true" />
                                        </span>
                                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink tabular">
                                            {session.when}
                                        </p>
                                        {session.live ? (
                                            <LiveChip label="In the call" />
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
                                    <li key={material.id} className="flex items-center gap-3 px-4 py-2.5">
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
                    <section className="card p-4">
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

                    <section className="card p-4">
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
                                    {classroom.board.can_draw
                                        ? 'The instructor has given you the pen for this lesson.'
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
