/**
 * A second adapter, deliberately small.
 *
 * It serves the board over a BroadcastChannel: two tabs on this device share
 * the same stage, ink and comments with no call server at all. It exists for two
 * reasons — the page stays usable when no provider is configured, and it shows
 * what "swap the realtime backend" actually costs: this file and a line in
 * config/realtime.php.
 */
import {
    BOARD_TOPIC,
    CALL_TOPIC,
    PRESENCE_TOPIC,
    UNKNOWN_SENDER,
    decodeBoardMessage,
    decodeCallMessage,
    decodePresence,
    type BoardMessage,
    type CallMessage,
    type FrameSender,
    type PresenceFrame,
} from './protocol';
import type { RecordingResult } from '@/lib/recording';
import type {
    CallParticipant,
    CallTransport,
    JoinResult,
    RealtimeConfig,
    TransportEvent,
    TransportOptions,
} from './types';

const TOPICS = [BOARD_TOPIC, PRESENCE_TOPIC, CALL_TOPIC];

interface Envelope {
    topic: string;
    payload: unknown;
    sender: FrameSender;
}

export class LocalTransport implements CallTransport {
    readonly driver = 'local';

    private listeners = new Set<(event: TransportEvent) => void>();
    private channel: BroadcastChannel | null = null;
    private identity = 'user-0-local';
    private name = 'You';
    private micEnabled = false;
    private peers = new Map<string, PresenceFrame>();

    constructor(
        private readonly config: RealtimeConfig,
        private readonly options: TransportOptions,
    ) {}

    subscribe(listener: (event: TransportEvent) => void): () => void {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }

    async join(): Promise<JoinResult> {
        this.emit({ type: 'status', status: 'connecting' });
        this.emit({ type: 'phase', phase: 'signal' });

        this.identity = `user-0-${this.options.tabSession}`;
        this.name = this.options.fallbackName;

        if (typeof BroadcastChannel !== 'undefined') {
            this.channel = new BroadcastChannel(this.channelName());
            this.channel.onmessage = (event: MessageEvent<Envelope>) => this.receive(event.data);
        }

        this.emit({ type: 'phase', phase: null });
        this.emit({ type: 'status', status: 'connected' });
        this.emit({ type: 'audio', blocked: false });
        this.emitParticipants();

        return {
            identity: this.identity,
            name: this.name,
            role: this.options.role,
            session: null,
            board: null,
            attendance: null,
        };
    }

    async leave(): Promise<void> {
        this.channel?.close();
        this.channel = null;
        this.peers.clear();

        this.emit({ type: 'status', status: 'idle' });
        this.emit({ type: 'participants', participants: [] });
    }

    async setMicrophone(enabled: boolean): Promise<void> {
        this.micEnabled = enabled;
        this.emit({ type: 'microphone', enabled });
        this.emitParticipants();
    }

    async setScreenShare(): Promise<void> {
        this.emit({ type: 'screenShare', enabled: false });
        this.emit({ type: 'notice', message: 'Screen sharing needs a configured call server.' });
    }

    /** There is no remote video to size without a call server. */
    requestScreenShareSize(): void {}

    async enableAudio(): Promise<void> {
        this.emit({ type: 'audio', blocked: false });
    }

    sendBoard(message: BoardMessage, kind: 'reliable' | 'lossy' = 'reliable'): void {
        void kind;
        this.post(BOARD_TOPIC, message);
    }

    sendPresence(frame: PresenceFrame): void {
        this.post(PRESENCE_TOPIC, frame);
    }

    sendComment(message: CallMessage): void {
        this.post(CALL_TOPIC, message);
    }

    async mediaPath(): Promise<string | null> {
        return this.channel === null ? null : 'local (no media server)';
    }

    /** There is no media here to record, only the board frames. */
    async startRecording(): Promise<void> {
        throw new Error('Recording needs a configured call server.');
    }

    async stopRecording(): Promise<RecordingResult | null> {
        return null;
    }

    // -- internals ---------------------------------------------------------

    private receive(envelope: Envelope): void {
        if (!TOPICS.includes(envelope?.topic)) {
            return;
        }

        const sender: FrameSender = envelope.sender ?? UNKNOWN_SENDER;

        if (envelope.topic === BOARD_TOPIC) {
            const message = decodeBoardMessage(toBytes(envelope.payload));

            if (message !== null) {
                this.emit({ type: 'board', message, sender });
            }

            return;
        }

        if (envelope.topic === CALL_TOPIC) {
            const message = decodeCallMessage(toBytes(envelope.payload));

            if (message !== null) {
                this.emit({ type: 'comment', message, sender });
            }

            return;
        }

        const frame = decodePresence(toBytes(envelope.payload));

        if (frame === null || frame.identity === this.identity) {
            return;
        }

        this.peers.set(frame.identity, frame);
        this.emit({ type: 'presence', frame });
        this.emitParticipants();
    }

    private emitParticipants(): void {
        const self: CallParticipant = {
            identity: this.identity,
            name: `${this.name} (this tab)`,
            isLocal: true,
            isSpeaking: false,
            micEnabled: this.micEnabled,
            canPublish: true,
            screenShare: null,
            role: this.options.role,
        };

        const peers = Array.from(this.peers.values()).map((frame): CallParticipant => ({
            identity: frame.identity,
            name: frame.name,
            isLocal: false,
            isSpeaking: false,
            micEnabled: false,
            canPublish: true,
            screenShare: null,
            role: frame.role,
        }));

        this.emit({ type: 'participants', participants: [self, ...peers] });
    }

    private post(topic: string, payload: unknown): void {
        if (this.channel === null) {
            return;
        }

        // The sender travels with the frame: a BroadcastChannel has no notion of
        // who is talking, and the board needs to know who drew a stroke.
        const sender: FrameSender = { identity: this.identity, name: this.name, role: this.options.role };

        this.channel.postMessage({ topic, payload, sender } satisfies Envelope);
    }

    private channelName(): string {
        const match = /\/classes\/(\d+)\//.exec(`${this.config.tokenUrl}/`);

        return `cognita.local.${match?.[1] ?? 'demo'}`;
    }

    private emit(event: TransportEvent): void {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}

/** The codec speaks bytes; a BroadcastChannel hands the object back as-is. */
function toBytes(payload: unknown): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(payload));
}
