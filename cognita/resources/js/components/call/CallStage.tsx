import ParticipantTile from '@/components/call/ParticipantTile';
import ScreenShareView from '@/components/call/ScreenShareView';
import type { CallParticipant } from '@/realtime';

/**
 * The people in the call: a responsive grid while nobody is presenting, and a
 * strip beside the board while somebody is. Both animate in, so a join is
 * something you notice rather than something that silently appears.
 */
export default function CallStage({
    participants,
    hands,
    layout,
    onScreenShareSize,
}: {
    participants: CallParticipant[];
    hands: Set<string>;
    layout: 'grid' | 'strip';
    /** Reports how big the shared screen is drawn, so the share can be sized. */
    onScreenShareSize?: (width: number, height: number) => void;
}) {
    const sharing = participants.find((participant) => participant.screenShare !== null) ?? null;

    if (layout === 'grid' && sharing !== null) {
        return (
            <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
                <ScreenShareView participant={sharing} onSize={onScreenShareSize} />

                <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
                    {participants.map((participant) => (
                        <div key={participant.identity} className="w-[148px] shrink-0">
                            <ParticipantTile
                                participant={participant}
                                handRaised={hands.has(participant.identity)}
                                layout="strip"
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (layout === 'strip') {
        return (
            <div className="participant-strip">
                {participants.map((participant) => (
                    <ParticipantTile
                        key={participant.identity}
                        participant={participant}
                        handRaised={hands.has(participant.identity)}
                        layout="strip"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-3">
            <div className="grid w-full max-w-[900px] grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3">
                {participants.map((participant) => (
                    <ParticipantTile
                        key={participant.identity}
                        participant={participant}
                        handRaised={hands.has(participant.identity)}
                    />
                ))}
            </div>
        </div>
    );
}
