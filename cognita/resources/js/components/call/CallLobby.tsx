import { ArrowLeft, ArrowRight, HandPalm, LockSimple, ShieldCheck, Sparkle, Spinner, Users } from '@phosphor-icons/react';
import { Link, router } from '@inertiajs/react';
import DoctorReportView from '@/components/call/DoctorReportView';
import WaitingRoom from '@/components/call/WaitingRoom';
import { JOIN_PHASE_LABEL, type CallRole, type DoctorReport, type JoinPhase } from '@/realtime';
import type { PaymentState, SessionState } from '@/types';
import { cn, formatMoment } from '@/lib/utils';

interface CallLobbyProps {
    classroom: { name: string; join_code: string; course: string | null; instructor: string | null };
    role: CallRole;
    driver: string;
    previewOnly: boolean;
    secureContext: boolean;
    secureUrl: string | null;
    joining: boolean;
    phase: JoinPhase | null;
    error: string | null;
    notice: string | null;
    doctor: DoctorReport | null;
    doctorBusy: boolean;
    /** The state of the session this class is in. */
    sessionState: SessionState;
    sessionTitle: string | null;
    sessionDescription: string | null;
    sessionStartsAt: string | null;
    /** Whether this student's payment unlocks the live room. */
    payment: PaymentState;
    onJoin: () => void;
    onRunDoctor: () => void;
    /** The heartbeat endpoint the waiting room watches. */
    touchUrl: string;
    backUrl: string;
}

/**
 * What a person sees before they join.
 *
 * It is also the honest place to say what this board is: drawings belong to the
 * room, not to the class, so the next lesson starts clean. The card fades in
 * once, on arrival.
 *
 * For a student this is where the rules of the room are enforced: a session the
 * instructor never announced cannot be entered, a session that has passed
 * cannot be rejoined, and a session that was announced but has not opened is a
 * waiting room rather than a call.
 */
export default function CallLobby({
    classroom,
    role,
    driver,
    previewOnly,
    secureContext,
    secureUrl,
    joining,
    phase,
    error,
    notice,
    doctor,
    doctorBusy,
    sessionState,
    sessionTitle,
    sessionDescription,
    sessionStartsAt,
    payment,
    onJoin,
    onRunDoctor,
    touchUrl,
    backUrl,
}: CallLobbyProps) {
    const startsAt = formatMoment(sessionStartsAt);

    if (role === 'participant' && payment.required && !payment.can_access) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
                <div className="lobby-in w-full max-w-md rounded-xl border border-stage-line bg-stage-raised p-6 shadow-stage">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stage-warn/15 text-stage-warn">
                            <LockSimple size={17} aria-hidden="true" />
                        </span>
                        <p className="text-[11.5px] font-medium text-stage-ink/55">Paid course · live room locked</p>
                    </div>

                    <h1 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-stage-ink">
                        {sessionTitle ?? classroom.name}
                    </h1>

                    {startsAt !== null ? (
                        <p className="mt-1.5 text-[13px] text-stage-ink/55">
                            {startsAt}
                            {classroom.instructor !== null ? ` · ${classroom.instructor}` : ''}
                        </p>
                    ) : null}

                    {sessionDescription !== null ? (
                        <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-stage-ink/65">
                            {sessionDescription}
                        </p>
                    ) : null}

                    <div className="mt-4 rounded-lg border border-stage-ink/10 bg-stage-ink/5 px-3 py-2.5">
                        <p className="text-[12.5px] leading-relaxed text-stage-ink/70">
                            The class key gets you into the class, but the live room is for paid students. Pay{' '}
                            <span className="font-semibold text-stage-ink">{payment.price_label}</span> and your
                            instructor will unlock the room once the payment is confirmed.
                        </p>
                        {payment.payment_instructions !== null ? (
                            <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-stage-ink/55">
                                {payment.payment_instructions}
                            </p>
                        ) : null}
                        {payment.status === 'pending' ? (
                            <p className="mt-2 text-[12px] font-medium text-stage-warn">
                                Payment submitted. Waiting for your instructor to confirm it.
                            </p>
                        ) : null}
                    </div>

                    <div className="mt-5 flex flex-col gap-2">
                        {payment.payment_url !== null ? (
                            <a
                                href={payment.payment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="join-button w-full"
                            >
                                Pay {payment.price_label}
                                <ArrowRight size={16} weight="bold" aria-hidden="true" />
                            </a>
                        ) : null}

                        {payment.submit_url !== null && payment.status !== 'pending' ? (
                            <button
                                type="button"
                                onClick={() => router.post(payment.submit_url!, {}, { preserveScroll: true })}
                                className="btn btn-outline w-full"
                            >
                                I have paid
                            </button>
                        ) : null}

                        <Link href={backUrl} className="btn btn-quiet w-full">
                            <ArrowLeft size={16} aria-hidden="true" />
                            Back to my classes
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (role === 'participant' && sessionState === 'waiting') {
        return (
            <WaitingRoom
                title={sessionTitle}
                description={sessionDescription}
                startsAt={startsAt}
                host={classroom.instructor}
                touchUrl={touchUrl}
                onJoin={onJoin}
                onEnded={() => undefined}
            />
        );
    }

    if (role === 'participant' && (sessionState === 'passed' || sessionState === 'none')) {
        const ended = sessionState === 'passed';

        return (
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
                <div className="lobby-in w-full max-w-md rounded-xl border border-stage-line bg-stage-raised p-6 shadow-stage">
                    <p className="text-[11.5px] font-medium text-stage-ink/55">
                        {ended ? 'This session has ended' : 'No session yet'}
                    </p>
                    <h1 className="mt-2.5 text-[22px] font-semibold tracking-[-0.02em] text-stage-ink">
                        {ended ? 'You cannot rejoin it' : 'Nothing to join yet'}
                    </h1>
                    <p className="mt-2 text-[13px] leading-relaxed text-stage-ink/65">
                        {ended
                            ? 'The lesson you were waiting for is over. Sessions are kept on the class page, but a finished one cannot be entered again.'
                            : `${classroom.instructor ?? 'Your instructor'} has not announced a session for this class yet. As soon as one is scheduled, you can wait in the room and join the moment it opens.`}
                    </p>
                    <Link href={backUrl} className="join-button mt-5 w-full">
                        <ArrowLeft size={16} aria-hidden="true" />
                        Back to my classes
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
            <div className="lobby-in w-full max-w-md rounded-xl border border-stage-line bg-stage-raised p-5 shadow-stage">
                <p className="text-[11.5px] font-medium text-stage-ink/45">
                    {role === 'host' ? 'You are teaching this class' : 'You are joining as a student'}
                </p>
                <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-stage-ink">{classroom.name}</h1>
                <p className="mt-1 text-[13px] text-stage-ink/55">
                    {[classroom.course, classroom.instructor].filter(Boolean).join(' · ') || 'Live class'}
                </p>

                {sessionDescription !== null ? (
                    <p className="mt-3 whitespace-pre-line rounded-lg border border-stage-ink/10 bg-stage-ink/5 px-3 py-2 text-[12px] leading-relaxed text-stage-ink/65">
                        {sessionDescription}
                    </p>
                ) : null}

                {role === 'host' && startsAt !== null && sessionState === 'waiting' ? (
                    <p className="mt-4 rounded-lg border border-stage-ink/10 bg-stage-ink/5 px-3 py-2 text-[12px] leading-relaxed text-stage-ink/70">
                        <span className="font-semibold text-stage-ink">Session scheduled for {startsAt}.</span> Starting the
                        room opens it for everyone who is waiting.
                    </p>
                ) : null}

                <ul className="mt-5 space-y-2 text-[12px] leading-relaxed text-stage-ink/65">
                    <li className="flex items-start gap-2">
                        <Users size={15} className="mt-0.5 shrink-0 text-stage-ink/40" aria-hidden="true" />
                        {role === 'host'
                            ? 'Everyone in the class hears one group call. Your microphone starts on; students ask to talk.'
                            : 'Everyone in the class hears one group call. You join muted and listen until the instructor lets you talk.'}
                    </li>
                    <li className="flex items-start gap-2">
                        <HandPalm size={15} className="mt-0.5 shrink-0 text-stage-ink/40" aria-hidden="true" />
                        {role === 'host'
                            ? 'Raised hands appear in the header and Participants; allow a student to open their microphone.'
                            : 'Raise your hand to ask to talk. The instructor opens your microphone for this call only.'}
                    </li>
                    <li className="flex items-start gap-2">
                        <Sparkle size={15} className="mt-0.5 shrink-0 text-stage-ink/40" aria-hidden="true" />
                        Nothing you draw is saved. The ink belongs to this room and disappears when it ends; the
                        PDFs attached to the class stay.
                    </li>
                </ul>

                {previewOnly ? (
                    <p className="mt-4 rounded-lg border border-stage-warn/40 bg-stage-warn/10 px-3 py-2 text-[11px] leading-relaxed text-stage-warn">
                        No <span className="font-semibold">{driver}</span> call server is configured, so the board runs
                        in local preview: tabs on this device share it, there is no voice.
                    </p>
                ) : null}

                {error !== null ? (
                    <div className="mt-4 space-y-2">
                        <p className="rounded-lg border border-stage-danger/40 bg-stage-danger/10 px-3 py-2 text-[12px] leading-relaxed text-stage-danger" role="alert">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={onRunDoctor}
                            disabled={doctorBusy}
                            className="text-[11px] font-semibold text-stage-ink/60 underline underline-offset-2 transition hover:text-stage-ink"
                        >
                            {doctorBusy ? 'Checking the connection…' : 'Run a connection check'}
                        </button>
                        {doctor !== null ? <DoctorReportView report={doctor} /> : null}
                    </div>
                ) : null}

                {error === null && notice !== null ? (
                    <p className="mt-4 rounded-lg border border-stage-ink/10 bg-stage-ink/5 px-3 py-2 text-[12px] leading-relaxed text-stage-ink/70">
                        {notice}
                    </p>
                ) : null}

                <button
                    type="button"
                    onClick={onJoin}
                    disabled={joining}
                    className={cn('join-button mt-5 w-full', joining && 'is-busy')}
                >
                    {joining ? <Spinner size={16} className="animate-spin" aria-hidden="true" /> : null}
                    {joining
                        ? (phase === null ? 'Joining…' : JOIN_PHASE_LABEL[phase])
                        : role === 'host' && sessionState === 'waiting'
                          ? 'Start the session'
                          : 'Join the call'}
                    {joining ? null : <ArrowRight size={16} weight="bold" aria-hidden="true" />}
                </button>

                {!secureContext && secureUrl !== null ? (
                    <a
                        href={secureUrl}
                        className="mt-3 flex items-start gap-2 rounded-lg border border-stage-warn/40 bg-stage-warn/10 px-3 py-2 text-[11px] leading-relaxed text-stage-warn"
                    >
                        <ShieldCheck size={15} className="mt-0.5" aria-hidden="true" />
                        This page is not on a secure origin, so the browser will not open a microphone. Open{' '}
                        <span className="font-semibold">https</span> to join with voice.
                    </a>
                ) : null}

                <p className="mt-3 text-center text-[10px] text-stage-ink/30">
                    {driver} · room {classroom.join_code}
                </p>
            </div>
        </div>
    );
}
