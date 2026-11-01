import { Crown, MicrophoneSlash } from '@phosphor-icons/react';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export interface CallParticipant {
    identity: string;
    name: string;
    isLocal: boolean;
    isSpeaking: boolean;
    micEnabled: boolean;
    role: 'host' | 'participant';
}

export default function ParticipantTile({
    participant,
    layout = 'grid',
}: {
    participant: CallParticipant;
    layout?: 'grid' | 'strip';
}) {
    if (layout === 'strip') {
        return (
            <div
                className={cn(
                    'flex w-[132px] shrink-0 items-center gap-2 rounded-xl border px-2 py-1.5 lg:w-full',
                    participant.isSpeaking ? 'border-live/60 bg-live/10' : 'border-stage-line bg-stage-raised',
                )}
            >
                <Avatar name={participant.name} size="sm" tone="stage" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-white/90">
                        {participant.name}
                        {participant.isLocal ? ' (you)' : ''}
                    </p>
                    <p className="text-[10px] text-white/45">{participant.role === 'host' ? 'Instructor' : 'Student'}</p>
                </div>
                {!participant.micEnabled ? (
                    <MicrophoneSlash size={13} className="shrink-0 text-white/45" aria-label="Muted" />
                ) : null}
            </div>
        );
    }

    return (
        <div className={cn('call-tile aspect-video', participant.isSpeaking && 'call-tile-speaking')}>
            <span className="absolute top-2 left-2 flex items-center gap-1">
                {participant.role === 'host' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                        <Crown size={11} weight="fill" aria-hidden="true" />
                        Instructor
                    </span>
                ) : null}
            </span>

            {!participant.micEnabled ? (
                <span className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white/70" title="Muted">
                    <MicrophoneSlash size={14} aria-hidden="true" />
                </span>
            ) : null}

            <Avatar
                name={participant.name}
                size="lg"
                tone="stage"
                className={participant.isSpeaking ? 'bg-live text-white' : undefined}
            />
            <p className="call-name mt-2 max-w-[90%] truncate">
                {participant.name}
                {participant.isLocal ? ' (you)' : ''}
            </p>
        </div>
    );
}
