import type { RecordingResult } from '@/lib/recording';
import type { BoardState } from '@/types';
import type { BoardMessage, CallMessage, CallRole, FrameSender, PresenceFrame } from './protocol';

/** The doctor report is part of the contract: every provider must be able to explain itself. */
export type { DoctorCheck, DoctorReport } from '@/lib/api';

/**
 * What the call page is allowed to assume about a realtime backend.
 *
 * Every adapter (LiveKit today, something else tomorrow) turns its own events
 * into this small vocabulary: a status, a participant list, a microphone state
 * and the three kinds of frame. The React layer above never imports a vendor
 * SDK, which is the whole point of this file.
 */

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export type JoinPhase = 'permission' | 'signal' | 'media';

export interface CallParticipant {
    identity: string;
    name: string;
    isLocal: boolean;
    isSpeaking: boolean;
    micEnabled: boolean;
    /** Whether the call server currently lets this person publish tracks. */
    canPublish: boolean;
    /** The screen this person is sharing, if any. */
    screenShare: MediaStreamTrack | null;
    role: CallRole;
}

export interface AttendanceSession {
    id: number;
    ping_url: string;
    leave_url: string;
}

/** The call-server details handed to the page by LiveCallController. */
export interface RealtimeConfig {
    driver: string;
    configured: boolean;
    signalUrl: string;
    secureUrl: string | null;
    tokenUrl: string;
    doctorUrl: string;
    /** Class lifecycle: keep warm, leave without ending, start a clean board, end. */
    touchUrl: string;
    leaveUrl: string;
    restartUrl: string;
    endUrl: string;
}

export interface TransportOptions {
    role: CallRole;
    /** Per-tab suffix so two tabs are two participants, not a fight. */
    tabSession: string;
    secureContext: boolean;
    fallbackName: string;
}

export interface JoinResult {
    identity: string;
    name: string;
    role: CallRole;
    /** The room the joiner landed in, and the board as it stood at that moment. */
    session: string | null;
    board: BoardState | null;
    attendance: AttendanceSession | null;
}

export type TransportEvent =
    | { type: 'status'; status: ConnectionStatus }
    | { type: 'phase'; phase: JoinPhase | null }
    | { type: 'notice'; message: string | null }
    | { type: 'error'; message: string }
    | { type: 'ended'; reason: string | null }
    | { type: 'participants'; participants: CallParticipant[] }
    | { type: 'microphone'; enabled: boolean }
    | { type: 'screenShare'; enabled: boolean }
    | { type: 'audio'; blocked: boolean }
    | { type: 'board'; message: BoardMessage; sender: FrameSender }
    | { type: 'presence'; frame: PresenceFrame }
    | { type: 'comment'; message: CallMessage; sender: FrameSender }
    | { type: 'recording'; state: 'started' }
    | { type: 'recording'; state: 'stopped'; result: RecordingResult | null };

export interface CallTransport {
    readonly driver: string;

    subscribe(listener: (event: TransportEvent) => void): () => void;

    /** Join the room and report where the joiner landed. */
    join(): Promise<JoinResult>;

    leave(): Promise<void>;

    setMicrophone(enabled: boolean): Promise<void>;

    /** Publish this device's screen, or stop publishing it. */
    setScreenShare(enabled: boolean): Promise<void>;

    /**
     * Tell the call server how much of a remote screen share this device can
     * actually show, in CSS pixels. Called by the viewer once the element that
     * displays it has a real size, so a phone is not sent a desktop stream.
     */
    requestScreenShareSize(width: number, height: number): void;

    /** Browsers hold playback until a gesture; this is that gesture. */
    enableAudio(): Promise<void>;

    sendBoard(message: BoardMessage, kind?: 'reliable' | 'lossy'): void;

    sendPresence(frame: PresenceFrame): void;

    sendComment(message: CallMessage): void;

    /** "UDP direct 192.168.1.20:7882", when the adapter can know that. */
    mediaPath(): Promise<string | null>;

    /**
     * Start a local, on-device recording of the class. The audio and any
     * shared screen are mixed in the browser; nothing is uploaded.
     */
    startRecording(title: string): Promise<void>;

    /** Stop it and hand back the finished file for download. */
    stopRecording(): Promise<RecordingResult | null>;
}

export type TransportFactory = (config: RealtimeConfig, options: TransportOptions) => CallTransport;
