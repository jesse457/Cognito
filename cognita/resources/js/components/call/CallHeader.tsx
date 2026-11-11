import { ArrowLeft, CalendarCheck, Check, Copy, HandPalm, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { Link } from '@inertiajs/react';
import { formatClock } from '@/lib/recording';
import { cn } from '@/lib/utils';

interface CallHeaderProps {
    name: string;
    course: string | null;
    instructor: string | null;
    joinCode: string;
    backUrl: string;
    /** The instructor's register, or null for everyone else. */
    attendanceUrl: string | null;
    inCall: boolean;
    reconnecting: boolean;
    participantCount: number;
    raisedHands: number;
    soundMuted: boolean;
    copied: boolean;
    recording: boolean;
    recordingSeconds: number;
    onToggleSound: () => void;
    onCopyKey: () => void;
    onShowHands: () => void;
}

/** The strip above the stage: where you are, who is here, and how loud it is. */
export default function CallHeader({
    name,
    course,
    instructor,
    joinCode,
    backUrl,
    attendanceUrl,
    inCall,
    reconnecting,
    participantCount,
    raisedHands,
    soundMuted,
    copied,
    recording,
    recordingSeconds,
    onToggleSound,
    onCopyKey,
    onShowHands,
}: CallHeaderProps) {
    return (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-stage-line px-3 sm:px-4">
            <Link href={backUrl} className="call-control h-9 min-w-9 px-2" aria-label="Back to the class list">
                <ArrowLeft size={17} aria-hidden="true" />
            </Link>

            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-stage-ink">{name}</p>
                <p className="truncate text-[11px] text-stage-ink/50">
                    {[course, instructor].filter(Boolean).join(' · ') || 'Live class'}
                </p>
            </div>

            <button
                type="button"
                onClick={onCopyKey}
                className="call-control h-8 px-2.5 text-[11px]"
                title="Copy the class key"
            >
                <span className="font-mono tracking-[0.18em]">{joinCode}</span>
                {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </button>

            {attendanceUrl !== null ? (
                <a
                    href={attendanceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="call-control h-9 min-w-9 px-2"
                    title="Attendance for this class — opens in a new tab so the call stays up"
                    aria-label="Open attendance in a new tab"
                >
                    <CalendarCheck size={16} aria-hidden="true" />
                </a>
            ) : null}

            {inCall ? (
                <span className={cn('stage-chip hidden sm:inline-flex', reconnecting ? 'stage-chip-warn' : 'stage-chip-live')}>
                    <span className="live-dot" aria-hidden="true" />
                    {reconnecting ? 'Reconnecting' : 'Live'}
                </span>
            ) : null}

            {inCall && recording ? (
                <span className="stage-chip stage-chip-rec hidden sm:inline-flex" title="Recording to this device">
                    <span className="live-dot" aria-hidden="true" />
                    REC <span className="tabular">{formatClock(recordingSeconds)}</span>
                </span>
            ) : null}

            {raisedHands > 0 ? (
                <button
                    type="button"
                    onClick={onShowHands}
                    className="stage-chip stage-chip-warn transition hover:brightness-110"
                    title={`${raisedHands} hand(s) raised — open participants`}
                >
                    <HandPalm size={13} weight="fill" aria-hidden="true" />
                    <span className="tabular">{raisedHands}</span>
                    <span className="hidden sm:inline">Hand{raisedHands === 1 ? '' : 's'}</span>
                </button>
            ) : null}

            {inCall ? (
                <span className="stage-chip hidden md:inline-flex" title="People in this call">
                    {participantCount}
                </span>
            ) : null}

            <button
                type="button"
                onClick={onToggleSound}
                className={cn('call-control h-9 min-w-9 px-2', soundMuted && 'text-stage-ink/50')}
                aria-pressed={!soundMuted}
                title={soundMuted ? 'Turn notification sounds on' : 'Turn notification sounds off'}
                aria-label={soundMuted ? 'Turn notification sounds on' : 'Turn notification sounds off'}
            >
                {soundMuted ? <SpeakerSlash size={16} aria-hidden="true" /> : <SpeakerHigh size={16} aria-hidden="true" />}
            </button>
        </header>
    );
}
