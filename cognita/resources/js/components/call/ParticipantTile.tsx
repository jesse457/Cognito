import { Crown, HandPalm, MicrophoneSlash, MonitorArrowUp } from '@phosphor-icons/react';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import type { CallParticipant } from '@/realtime';

export type { CallParticipant } from '@/realtime';

/**
 * One person in the call. Local participants animate their own tile in, and a
 * speaking tile pulses gently, so a group call reads at a glance instead of
 * needing the names.
 */
export default function ParticipantTile({
    participant,
    handRaised = false,
    layout = 'grid',
}: {
    participant: CallParticipant;
    handRaised?: boolean;
    layout?: 'grid' | 'strip';
}) {
    if (layout === 'strip') {
        return (
            <div
                className={cn(
                    'tile-in flex w-[132px] shrink-0 items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors duration-200 lg:w-full',
                    participant.isSpeaking
                        ? 'speaking-glow border-live/60 bg-live/10'
                        : 'border-stage-line bg-stage-raised',
                )}
            >
                <Avatar name={participant.name} size="sm" tone="stage" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-stage-ink/90">
                        {participant.name}
                        {participant.isLocal ? ' (you)' : ''}
                    </p>
                    <p className="text-[10px] text-stage-ink/45">{participant.role === 'host' ? 'Instructor' : 'Student'}</p>
                </div>
                {handRaised ? (
                    <HandPalm size={13} weight="fill" className="hand-wave shrink-0 text-stage-warn" aria-label="Hand raised" />
                ) : null}
                {participant.screenShare !== null ? (
                    <MonitorArrowUp size={13} className="shrink-0 text-brand" aria-label="Sharing screen" />
                ) : null}
                {!participant.micEnabled ? (
                    <MicrophoneSlash size={13} className="shrink-0 text-stage-ink/45" aria-label="Muted" />
                ) : null}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'call-tile tile-in aspect-video',
                participant.isSpeaking && 'call-tile-speaking speaking-glow',
            )}
        >
            <span className="absolute top-2 left-2 flex items-center gap-1">
                {participant.role === 'host' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-semibold text-brand-ink">
                        <Crown size={11} weight="fill" aria-hidden="true" />
                        Instructor
                    </span>
                ) : null}
            </span>

            {handRaised ? (
                <span className="absolute top-2 right-2 rounded-full bg-warn-soft p-1 text-warn" title="Hand raised">
                    <HandPalm size={14} weight="fill" className="hand-wave" aria-hidden="true" />
                </span>
            ) : !participant.micEnabled ? (
                <span className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-stage-ink/70" title="Muted">
                    <MicrophoneSlash size={14} aria-hidden="true" />
                </span>
            ) : null}

            <Avatar
                name={participant.name}
                size="lg"
                tone="stage"
                className={participant.isSpeaking ? 'bg-live text-live-ink' : undefined}
            />
            <p className="call-name mt-2 max-w-[90%] truncate">
                {participant.name}
                {participant.isLocal ? ' (you)' : ''}
            </p>
        </div>
    );
}
