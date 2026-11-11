import {
    ChartBar,
    ChatCircleDots,
    EyeSlash,
    FlagCheckered,
    HandPalm,
    LockSimple,
    Microphone,
    MicrophoneSlash,
    MonitorArrowUp,
    PhoneDisconnect,
    Record,
    SpeakerHigh,
    SquaresFour,
    Stop,
    Users,
} from '@phosphor-icons/react';
import { formatClock } from '@/lib/recording';
import { cn } from '@/lib/utils';

export type Panel = 'people' | 'comments' | 'polls' | null;

interface CallControlsProps {
    micEnabled: boolean;
    canTalk: boolean;
    screenShareEnabled: boolean;
    canShareScreen: boolean;
    handRaised: boolean;
    boardOpen: boolean;
    panel: Panel;
    audioBlocked: boolean;
    participantCount: number;
    commentCount: number;
    pollCount: number;
    recording: boolean;
    recordingSeconds: number;
    /** Instructor only: this browser can record the lesson locally. */
    canRecord: boolean;
    onToggleRecording: () => void;
    onToggleMic: () => void;
    onToggleScreenShare: () => void;
    onToggleHand: () => void;
    onToggleBoard: () => void;
    onPanel: (panel: Panel) => void;
    onEnableAudio: () => void;
    onLeave: () => void;
    /** Instructor only: close the class session for everyone. */
    onEndClass?: () => void;
    /** Fullscreen only: fold the call controls away and leave the board. */
    onHideControls?: () => void;
}

/** The bottom bar: the things anyone does during a lesson. */
export default function CallControls({
    micEnabled,
    canTalk,
    screenShareEnabled,
    canShareScreen,
    handRaised,
    boardOpen,
    panel,
    audioBlocked,
    participantCount,
    commentCount,
    pollCount,
    recording,
    recordingSeconds,
    canRecord,
    onToggleRecording,
    onToggleMic,
    onToggleScreenShare,
    onToggleHand,
    onToggleBoard,
    onPanel,
    onEnableAudio,
    onLeave,
    onEndClass,
    onHideControls,
}: CallControlsProps) {
    return (
        <div className="safe-bottom flex justify-center px-3 pb-3">
            <div className="callbar">
                <button
                    type="button"
                    onClick={canTalk ? onToggleMic : onToggleHand}
                    className={cn(
                        'call-control',
                        !canTalk ? 'text-stage-ink/50' : micEnabled ? 'call-control-live' : 'call-control-danger',
                    )}
                    aria-pressed={canTalk && micEnabled}
                    aria-disabled={!canTalk}
                    title={
                        !canTalk
                            ? handRaised
                                  ? 'Your hand is raised. Your instructor can open your microphone.'
                                  : 'Raise your hand to ask your instructor to let you talk'
                            : micEnabled
                              ? 'Mute your microphone'
                              : 'Unmute your microphone'
                    }
                >
                    {!canTalk ? (
                        handRaised ? (
                            <HandPalm size={17} weight="fill" aria-hidden="true" />
                        ) : (
                            <LockSimple size={17} aria-hidden="true" />
                        )
                    ) : micEnabled ? (
                        <Microphone size={17} aria-hidden="true" />
                    ) : (
                        <MicrophoneSlash size={17} aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                        {!canTalk ? (handRaised ? 'Hand raised' : 'Ask to talk') : micEnabled ? 'Mute' : 'Unmute'}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={canShareScreen ? onToggleScreenShare : undefined}
                    className={cn(
                        'call-control',
                        !canShareScreen && 'opacity-40',
                        screenShareEnabled && 'call-control-on',
                    )}
                    aria-pressed={screenShareEnabled}
                    aria-disabled={!canShareScreen}
                    title={
                        !canShareScreen
                            ? 'Raise your hand and wait for the instructor to open your microphone before sharing'
                            : screenShareEnabled
                              ? 'Stop sharing your screen'
                              : 'Share your screen with the class'
                    }
                >
                    <MonitorArrowUp size={17} weight={screenShareEnabled ? 'fill' : 'regular'} aria-hidden="true" />
                    <span className="hidden sm:inline">{screenShareEnabled ? 'Stop share' : 'Share'}</span>
                </button>

                <button
                    type="button"
                    onClick={onToggleHand}
                    className={cn('call-control', handRaised && 'bg-warn-soft text-warn hover:bg-warn-soft/80 hover:text-warn')}
                    aria-pressed={handRaised}
                    title={handRaised ? 'Lower your hand' : 'Raise your hand'}
                >
                    <HandPalm size={17} weight={handRaised ? 'fill' : 'regular'} aria-hidden="true" />
                    <span className="hidden sm:inline">{handRaised ? 'Hand up' : 'Hand'}</span>
                </button>

                <button
                    type="button"
                    onClick={onToggleBoard}
                    className={cn('call-control', boardOpen && 'call-control-on')}
                    aria-pressed={boardOpen}
                    title="Show or hide the shared board"
                >
                    <SquaresFour size={17} weight={boardOpen ? 'fill' : 'regular'} aria-hidden="true" />
                    <span className="hidden sm:inline">{boardOpen ? 'Hide board' : 'Board'}</span>
                </button>

                {canRecord ? (
                    <button
                        type="button"
                        onClick={onToggleRecording}
                        className={cn('call-control', recording && 'call-control-danger')}
                        aria-pressed={recording}
                        aria-label={recording ? 'Stop recording and save the file' : 'Record this lesson to this device'}
                        title={
                            recording
                                ? 'Stop recording and download the file to this device'
                                : 'Record this lesson to this device — nothing is uploaded'
                        }
                    >
                        {recording ? (
                            <Stop size={17} weight="fill" aria-hidden="true" />
                        ) : (
                            <Record size={17} weight="fill" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline">
                            {recording ? `Stop ${formatClock(recordingSeconds)}` : 'Record'}
                        </span>
                        {recording ? <span className="tabular sm:hidden">{formatClock(recordingSeconds)}</span> : null}
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={() => onPanel(panel === 'polls' ? null : 'polls')}
                    className={cn('call-control', panel === 'polls' && 'call-control-on')}
                    aria-pressed={panel === 'polls'}
                    title="Live polls"
                >
                    <ChartBar size={17} aria-hidden="true" />
                    <span className="hidden sm:inline">Polls</span>
                    {pollCount > 0 ? <span className="tabular">{pollCount}</span> : null}
                </button>

                <button
                    type="button"
                    onClick={() => onPanel(panel === 'comments' ? null : 'comments')}
                    className={cn('call-control', panel === 'comments' && 'call-control-on')}
                    aria-pressed={panel === 'comments'}
                    title="Class comments"
                >
                    <ChatCircleDots size={17} aria-hidden="true" />
                    <span className="hidden sm:inline">Comments</span>
                    {commentCount > 0 ? <span className="tabular">{commentCount}</span> : null}
                </button>

                <button
                    type="button"
                    onClick={() => onPanel(panel === 'people' ? null : 'people')}
                    className={cn('call-control', panel === 'people' && 'call-control-on')}
                    aria-pressed={panel === 'people'}
                    title="Participants"
                >
                    <Users size={17} aria-hidden="true" />
                    <span className="tabular">{participantCount}</span>
                </button>

                {onHideControls !== undefined ? (
                    <button
                        type="button"
                        onClick={onHideControls}
                        className="call-control"
                        title="Hide the controls and keep the board"
                    >
                        <EyeSlash size={17} aria-hidden="true" />
                        <span className="hidden sm:inline">Hide</span>
                    </button>
                ) : null}

                {audioBlocked ? (
                    <button
                        type="button"
                        onClick={onEnableAudio}
                        className="call-control call-control-live"
                        title="The browser is holding playback until you allow it"
                    >
                        <SpeakerHigh size={17} aria-hidden="true" />
                        <span className="hidden sm:inline">Enable sound</span>
                    </button>
                ) : null}

                {onEndClass !== undefined ? (
                    <button
                        type="button"
                        onClick={onEndClass}
                        className="call-control call-control-danger px-4"
                        title="End the class for everyone"
                    >
                        <FlagCheckered size={17} weight="fill" aria-hidden="true" />
                        <span className="hidden sm:inline">End class</span>
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={onLeave}
                    className={cn('call-control px-4', onEndClass === undefined && 'call-control-danger')}
                    title={onEndClass === undefined ? 'Leave the call' : 'Leave the call without ending the class'}
                >
                    <PhoneDisconnect size={17} weight="fill" aria-hidden="true" />
                    <span className="hidden sm:inline">Leave</span>
                </button>
            </div>
        </div>
    );
}
