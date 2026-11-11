import { ArrowRight, HandPalm, ShieldCheck, Sparkle, Spinner, Users } from '@phosphor-icons/react';
import DoctorReportView from '@/components/call/DoctorReportView';
import { JOIN_PHASE_LABEL, type CallRole, type DoctorReport, type JoinPhase } from '@/realtime';
import { cn } from '@/lib/utils';

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
    onJoin: () => void;
    onRunDoctor: () => void;
}

/**
 * What a person sees before they join.
 *
 * It is also the honest place to say what this board is: drawings belong to the
 * room, not to the class, so the next lesson starts clean. The card fades in
 * once, on arrival.
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
    onJoin,
    onRunDoctor,
}: CallLobbyProps) {
    return (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
            <div className="lobby-in w-full max-w-md rounded-3xl border border-stage-line bg-stage-raised/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-stage-ink/45 uppercase">
                    {role === 'host' ? 'You are teaching this class' : 'You are joining as a student'}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stage-ink">{classroom.name}</h1>
                <p className="mt-1 text-[13px] text-stage-ink/55">
                    {[classroom.course, classroom.instructor].filter(Boolean).join(' · ') || 'Live class'}
                </p>

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
                    <p className="mt-4 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-[11px] leading-relaxed text-warn">
                        No <span className="font-semibold">{driver}</span> call server is configured, so the board runs
                        in local preview: tabs on this device share it, there is no voice.
                    </p>
                ) : null}

                {error !== null ? (
                    <div className="mt-4 space-y-2">
                        <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] leading-relaxed text-danger" role="alert">
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
                    <p className="mt-4 rounded-xl border border-stage-ink/10 bg-stage-ink/5 px-3 py-2 text-[12px] leading-relaxed text-stage-ink/70">
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
                    {joining ? (phase === null ? 'Joining…' : JOIN_PHASE_LABEL[phase]) : 'Join the call'}
                    {joining ? null : <ArrowRight size={16} weight="bold" aria-hidden="true" />}
                </button>

                {!secureContext && secureUrl !== null ? (
                    <a
                        href={secureUrl}
                        className="mt-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-[11px] leading-relaxed text-warn"
                    >
                        <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
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
