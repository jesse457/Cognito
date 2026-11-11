/**
 * LiveKit behind the transport interface.
 *
 * This is the only file in the browser bundle that knows livekit-client exists.
 * It turns room events into the app's vocabulary, publishes the three frame
 * topics, and keeps playback of remote microphones to itself so the React layer
 * never handles a track.
 */
import {
    ConnectionState,
    DisconnectReason,
    Room,
    RoomEvent,
    Track,
    VideoPreset,
    type Participant,
    type RemoteTrack,
    type RemoteTrackPublication,
    type TrackPublication,
} from 'livekit-client';
import { requestGrant, type CallGrant } from '@/lib/api';
import { describeMediaPath, describeMediaPathText, watchPeerConnections } from '@/lib/media';
import { LocalRecording, type RecordingResult } from '@/lib/recording';
import { disconnectReasonMessage, joinError, microphoneError, screenShareError } from './messages';
import {
    BOARD_TOPIC,
    CALL_TOPIC,
    PRESENCE_TOPIC,
    decodeBoardMessage,
    decodeCallMessage,
    decodePresence,
    encodeFrame,
    roleFromMetadata,
    type BoardMessage,
    type CallMessage,
    type FrameSender,
    type PresenceFrame,
} from './protocol';
import type {
    CallParticipant,
    CallTransport,
    JoinResult,
    RealtimeConfig,
    TransportEvent,
    TransportOptions,
} from './types';

const CONNECT_TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 1_200;

/**
 * Screen share is the one track where a student pays for every pixel.
 *
 * The SDK default is 1080p at 2.5 Mbit/s, which is roughly a gigabyte per hour
 * per student — a lot of data for a slide deck, and more than a phone on mobile
 * data can sustain. 1280x720 at 15 fps stays legible for text and diagrams,
 * and the bitrate ceiling below is enforced by the encoder rather than
 * requested politely.
 *
 * `contentHint: 'detail'` tells the encoder to protect sharp edges (text) over
 * smooth motion, which is what makes a lower bitrate still readable. Without it
 * the browser assumes video and throws away exactly the pixels that matter.
 */
const SCREEN_SHARE_RESOLUTION = { width: 1280, height: 720, frameRate: 15 };

/** 800 kbit/s: clear for shared documents, ~360 MiB for a 45-minute class. */
const SCREEN_SHARE_ENCODING = { maxBitrate: 800_000, maxFramerate: 15 };

/**
 * The quality rungs a student can be given.
 *
 * Two layers, lowest first as the SDK requires. A phone or a throttled link
 * takes the 640x360 rung at around 150 kbit/s — well under the top layer's
 * bandwidth — and the instructor's browser pays for one extra encode, not one
 * per viewer. Science on the trade: a frozen 720p feed is worse than a smooth
 * 360p one, so losing resolution is the right thing to lose first.
 */
const SCREEN_SHARE_LAYERS = [new VideoPreset(640, 360, 150_000, 15, 'low')];

/** The widths a share is ever requested at, so a slow drag cannot thrash it. */
const SCREEN_SHARE_STEPS = [360, 640, 1280];

/**
 * Round a wanted width up to a rung the publisher actually offers.
 *
 * These are the dimensions of the published layers, not arbitrary sizes: asking
 * for 960 when the encoder made 640 and 1280 would match neither and fall back
 * to the top layer, which is the opposite of the point.
 */
function snapToStep(width: number): number {
    for (const step of SCREEN_SHARE_STEPS) {
        if (width <= step) {
            return step;
        }
    }

    return SCREEN_SHARE_STEPS[SCREEN_SHARE_STEPS.length - 1];
}

export class LiveKitTransport implements CallTransport {
    readonly driver = 'livekit';

    private room: Room | null = null;
    private listeners = new Set<(event: TransportEvent) => void>();
    private audioHost: HTMLDivElement | null = null;
    private stopWatchingConnections: (() => void) | null = null;
    /**
     * Bumped every time publishing rights are withdrawn. A publish that started
     * before the bump must not land after it, or a taken-back microphone would
     * silently come back on when a slow getUserMedia finally resolves.
     */
    private publishEpoch = 0;
    /** Pending debounce for re-requesting the screen share size. */
    private qualityTimer: number | null = null;
    private stopWatchingResize: (() => void) | null = null;
    /** The on-device recorder, while one is running. */
    private recorder: LocalRecording | null = null;
    private startingRecording = false;
    private stopping: Promise<RecordingResult | null> | null = null;

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
        const isHost = this.options.role === 'host';

        this.emit({ type: 'status', status: 'connecting' });

        if (isHost) {
            this.emit({ type: 'phase', phase: 'permission' });

            const permissionNotice = await this.askForMicrophone();

            if (permissionNotice !== null) {
                this.emit({ type: 'notice', message: permissionNotice });
            }
        }

        this.emit({ type: 'phase', phase: 'signal' });

        let grant: CallGrant;

        try {
            grant = await requestGrant(this.config.tokenUrl, this.options.tabSession);
        } catch (error) {
            this.emit({ type: 'phase', phase: null });
            throw error;
        }

        const room = new Room({
            // adaptiveStream is deliberately OFF.
            //
            // It works by watching the elements LiveKit's own `attach()` placed
            // a track in. This app never calls attach(): ScreenShareView renders
            // the raw MediaStreamTrack through `srcObject`, so the SDK's element
            // list stays empty and its idea of the visible size stays {0,0}.
            // With adaptiveStream on, that zero is compared against every size
            // request and always "smaller", so it silently overwrote ours and
            // every share came through at full resolution.
            //
            // The size is reported explicitly instead (requestScreenShareSize),
            // measured from the element that is really showing the video.
            adaptiveStream: false,
            dynacast: true,
            audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });

        this.room = room;
        this.stopWatchingConnections = watchPeerConnections();
        this.stopWatchingResize = this.watchResize();
        this.wire(room);

        try {
            await this.connectWithRetry(room, grant);
        } catch (error) {
            await this.abort();
            throw new Error(joinError(error, this.config.signalUrl));
        }

        this.emit({ type: 'phase', phase: null });
        this.emit({ type: 'status', status: 'connected' });
        this.emitParticipants();
        this.emit({ type: 'audio', blocked: !room.canPlaybackAudio });

        void room.startAudio().then(
            () => this.emit({ type: 'audio', blocked: !room.canPlaybackAudio }),
            () => this.emit({ type: 'audio', blocked: true }),
        );

        if (isHost) {
            try {
                await room.localParticipant.setMicrophoneEnabled(true);
                this.emit({ type: 'microphone', enabled: true });
            } catch (error) {
                this.emit({ type: 'notice', message: `You joined muted. ${microphoneError(error)}` });
            }
        } else {
            this.emit({ type: 'microphone', enabled: false });
        }

        return {
            identity: grant.identity,
            name: room.localParticipant.name || grant.identity,
            role: grant.role,
            session: grant.session,
            board: grant.board,
            attendance: grant.attendance,
        };
    }

    async leave(): Promise<void> {
        await this.abort();
        this.emit({ type: 'status', status: 'idle' });
        this.emit({ type: 'participants', participants: [] });
        this.emit({ type: 'microphone', enabled: false });
        this.emit({ type: 'screenShare', enabled: false });
    }

    async setMicrophone(enabled: boolean): Promise<void> {
        const room = this.room;

        if (room === null) {
            return;
        }

        if (enabled && !this.canPublish(room.localParticipant)) {
            this.emit({
                type: 'notice',
                message: 'Your instructor has not opened your microphone. Raise your hand to ask to talk.',
            });
            this.emit({ type: 'microphone', enabled: false });

            return;
        }

        const epoch = this.publishEpoch;

        try {
            await room.localParticipant.setMicrophoneEnabled(enabled);

            // The instructor took the microphone back while getUserMedia was
            // still starting. Undo the publish that just landed.
            if (enabled && (epoch !== this.publishEpoch || !this.canPublish(room.localParticipant))) {
                await this.leaveTrack(room, Track.Source.Microphone);

                if (epoch !== this.publishEpoch) {
                    return;
                }

                this.emit({
                    type: 'notice',
                    message: 'Your instructor closed your microphone. Raise your hand to ask again.',
                });
            }

            this.emit({ type: 'microphone', enabled: room.localParticipant.isMicrophoneEnabled });
            this.emitParticipants();
        } catch (error) {
            this.emit({ type: 'notice', message: microphoneError(error) });
            this.emit({ type: 'microphone', enabled: room.localParticipant.isMicrophoneEnabled });
        }
    }

    /**
     * Take one source off the room and stop the capture device behind it.
     *
     * Muting alone keeps the track published, and LiveKit keeps forwarding it,
     * so the microphone light stays on and packets keep flowing. Removing the
     * publication is the only state a student has nothing to re-enable from.
     */
    private async leaveTrack(room: Room, source: Track.Source): Promise<void> {
        const publication = room.localParticipant.getTrackPublication(source);
        const track = publication?.track;

        if (track === undefined) {
            return;
        }

        try {
            await room.localParticipant.unpublishTrack(track, true);
        } catch {
            /* fall through to stopping the media track directly */
        }

        track.stop();
    }

    /**
     * Ask the server for a screen share no larger than this device can show.
     *
     * Screen share is the one track a student pays real data for. The publisher
     * offers a 640x360 rung and a 1280x720 one; which arrives is decided here,
     * by the size of the box the share is actually rendered into. Without this
     * a phone downloads the full 720p layer and throws most of it away.
     *
     * Only ever asks for one of the published rungs: LiveKit picks the layer
     * whose dimensions fit, so naming an arbitrary width just means "not that
     * one" rather than a resolution it cannot deliver.
     */
    requestScreenShareSize(width: number, height: number): void {
        const room = this.room;

        if (room === null || width <= 0 || height <= 0) {
            return;
        }

        const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);

        // The box the video is drawn in, not the size it is painted at. The
        // element uses object-contain, so a 601x476 box shows a 601x338 picture
        // with black bands above and below. Sizing by the *height* of that box
        // (476) would ask for a taller picture than is ever visible, so cap by
        // whichever axis runs out first at the share's 16:9 shape.
        const wanted = snapToStep(Math.round(Math.min(width, height * (16 / 9)) * dpr));

        for (const participant of room.remoteParticipants.values()) {
            const publication = participant.getTrackPublication(Track.Source.ScreenShare);

            if (publication === undefined) {
                continue;
            }

            (publication as RemoteTrackPublication).setVideoDimensions({
                width: wanted,
                height: Math.round((wanted * 9) / 16),
            });
        }
    }

    /**
     * Ask for the smallest share that still looks right, measured from the
     * element that is displaying it.
     *
     * Called when a share arrives and whenever the window changes size.
     */
    private applyScreenShareQuality(): void {
        if (typeof document === 'undefined') {
            return;
        }

        const stage = document.querySelector('[data-screen-stage]');

        if (stage === null) {
            return;
        }

        const rect = stage.getBoundingClientRect();

        this.requestScreenShareSize(rect.width, rect.height);
    }

    /**
     * Coalesce quality changes.
     *
     * Dragging a window edge fires resize on every frame, and each request is a
     * round trip to the call server. Waiting for the resize to stop means one
     * request instead of hundreds.
     */
    private scheduleScreenShareQuality(): void {
        if (this.qualityTimer !== null) {
            window.clearTimeout(this.qualityTimer);
        }

        this.qualityTimer = window.setTimeout(() => {
            this.qualityTimer = null;
            this.applyScreenShareQuality();
        }, 350);
    }

    /** Re-negotiate the share size when the student resizes their window. */
    private watchResize(): () => void {
        if (typeof window === 'undefined') {
            return () => {};
        }

        const onChange = (): void => this.scheduleScreenShareQuality();

        window.addEventListener('resize', onChange);

        return () => window.removeEventListener('resize', onChange);
    }

    async setScreenShare(enabled: boolean): Promise<void> {
        const room = this.room;

        if (room === null) {
            return;
        }

        if (enabled && !this.canPublish(room.localParticipant)) {
            this.emit({
                type: 'notice',
                message: 'Your instructor has not opened your microphone. Raise your hand to ask to talk before sharing your screen.',
            });
            this.emit({ type: 'screenShare', enabled: false });

            return;
        }

        const epoch = this.publishEpoch;

        try {
            // Capture at a sensible ceiling and publish two layers.
            //
            // A single-layer share can only be forwarded whole, so a student on
            // a phone still downloads every pixel of a 720p desktop. Two layers
            // let the server hand each student the size that suits their window
            // and connection: a small one for a phone or a slow link, the full
            // one only for someone who can actually show it.
            await room.localParticipant.setScreenShareEnabled(
                enabled,
                {
                    audio: true,
                    resolution: SCREEN_SHARE_RESOLUTION,
                    contentHint: 'detail',
                },
                {
                    // Screen share ignores `videoEncoding`; the SDK reads
                    // `screenShareEncoding` for this source, and defaults it to
                    // 1080p / 2.5 Mbit/s. This is the top layer's ceiling.
                    screenShareEncoding: SCREEN_SHARE_ENCODING,
                    simulcast: true,
                    // Low quality first, as the SDK requires.
                    screenShareSimulcastLayers: SCREEN_SHARE_LAYERS,
                    dtx: true,
                    degradationPreference: 'maintain-resolution',
                },
            );

            // Same late-arrival guard as the microphone: a share that finished
            // starting after the instructor withdrew permission is undone.
            if (enabled && epoch !== this.publishEpoch) {
                await this.leaveTrack(room, Track.Source.ScreenShare);
                await this.leaveTrack(room, Track.Source.ScreenShareAudio);

                return;
            }

            this.emit({ type: 'screenShare', enabled: room.localParticipant.isScreenShareEnabled });
            this.emitParticipants();
        } catch (error) {
            this.emit({ type: 'notice', message: screenShareError(error) });
            this.emit({ type: 'screenShare', enabled: room.localParticipant.isScreenShareEnabled });
        }
    }

    async enableAudio(): Promise<void> {
        const room = this.room;

        if (room === null) {
            return;
        }

        try {
            await room.startAudio();
        } catch {
            this.emit({ type: 'notice', message: 'Could not start audio playback.' });
        }

        this.emit({ type: 'audio', blocked: !room.canPlaybackAudio });
    }

    /**
     * Record the lesson on this device only.
     *
     * The recorder reads the room's live media tracks directly, so no server
     * recording service is involved: the voices, and whichever screen is on the
     * stage, are mixed by the browser and downloaded when the instructor stops.
     */
    async startRecording(title: string): Promise<void> {
        if (this.recorder !== null || this.startingRecording) {
            return;
        }

        const room = this.room;

        if (room === null) {
            throw new Error('Join the call before recording.');
        }

        this.startingRecording = true;

        try {
            const recorder = new LocalRecording({
                title,
                audio: () => this.recordingAudio(room),
                share: () => this.recordingShare(room),
            });

            await recorder.start();
            this.recorder = recorder;
            this.emit({ type: 'recording', state: 'started' });
        } finally {
            this.startingRecording = false;
        }
    }

    async stopRecording(): Promise<RecordingResult | null> {
        if (this.stopping !== null) {
            return this.stopping;
        }

        const recorder = this.recorder;

        if (recorder === null) {
            return null;
        }

        this.recorder = null;
        this.stopping = recorder
            .stop()
            .then((result) => {
                this.emit({ type: 'recording', state: 'stopped', result });

                return result;
            })
            .finally(() => {
                this.stopping = null;
            });

        return this.stopping;
    }

    /** Every live audio track the room can hear, this microphone included. */
    private recordingAudio(room: Room): MediaStreamTrack[] {
        const tracks: MediaStreamTrack[] = [];
        const push = (publication: TrackPublication | undefined): void => {
            const media = publication?.track?.mediaStreamTrack;

            if (media !== undefined && media.readyState === 'live') {
                tracks.push(media);
            }
        };

        push(room.localParticipant.getTrackPublication(Track.Source.Microphone));
        push(room.localParticipant.getTrackPublication(Track.Source.ScreenShareAudio));

        for (const participant of room.remoteParticipants.values()) {
            for (const publication of participant.audioTrackPublications.values()) {
                push(publication);
            }
        }

        return tracks;
    }

    /** The share the stage is showing, so the recording shows it too. */
    private recordingShare(room: Room): MediaStreamTrack | null {
        const local = this.screenShareOf(room.localParticipant);

        if (local !== null) {
            return local;
        }

        for (const participant of room.remoteParticipants.values()) {
            const share = this.screenShareOf(participant);

            if (share !== null) {
                return share;
            }
        }

        return null;
    }

    sendBoard(message: BoardMessage, kind: 'reliable' | 'lossy' = 'reliable'): void {
        this.publish(BOARD_TOPIC, message, kind === 'reliable');
    }

    sendPresence(frame: PresenceFrame): void {
        this.publish(PRESENCE_TOPIC, frame, false);
    }

    sendComment(message: CallMessage): void {
        this.publish(CALL_TOPIC, message, true);
    }

    async mediaPath(): Promise<string | null> {
        return describeMediaPathText(await describeMediaPath());
    }

    // -- room wiring -------------------------------------------------------

    private wire(room: Room): void {
        const refresh = (): void => this.emitParticipants();

        room.on(RoomEvent.ParticipantConnected, refresh)
            .on(RoomEvent.ParticipantDisconnected, refresh)
            .on(RoomEvent.ActiveSpeakersChanged, refresh)
            .on(RoomEvent.ParticipantMetadataChanged, refresh)
            .on(RoomEvent.ParticipantPermissionsChanged, (_previous, participant: Participant) =>
                this.applyPermissionChange(participant),
            )
            .on(RoomEvent.TrackMuted, refresh)
            .on(RoomEvent.TrackUnmuted, refresh)
            .on(RoomEvent.LocalTrackPublished, () => {
                this.emitScreenShareState();
                refresh();
            })
            .on(RoomEvent.LocalTrackUnpublished, () => {
                this.emitScreenShareState();
                refresh();
            })
            .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
                this.attachAudio(track);
                refresh();

                // A share just arrived: ask for the size this browser can
                // actually show before it settles into a full-resolution feed.
                if (track.source === Track.Source.ScreenShare) {
                    this.scheduleScreenShareQuality();
                }
            })
            .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
                this.detachAudio(track);
                refresh();
            })
            .on(RoomEvent.AudioPlaybackStatusChanged, () => {
                refresh();
                this.emit({ type: 'audio', blocked: !room.canPlaybackAudio });
            })
            .on(RoomEvent.SignalConnected, () => this.emit({ type: 'phase', phase: 'media' }))
            .on(RoomEvent.DataReceived, (raw, participant, _kind, topic) =>
                this.receive(raw as Uint8Array, participant, topic ?? ''),
            )
            .on(RoomEvent.ConnectionStateChanged, (state) => {
                if (state === ConnectionState.Connected) {
                    this.emit({ type: 'status', status: 'connected' });
                }

                if (state === ConnectionState.Reconnecting) {
                    this.emit({ type: 'status', status: 'reconnecting' });
                }
            })
            .on(RoomEvent.Reconnecting, () => {
                this.emit({ type: 'status', status: 'reconnecting' });
                this.emit({ type: 'notice', message: 'Connection dropped. Reconnecting…' });
            })
            .on(RoomEvent.Reconnected, () => {
                this.emit({ type: 'status', status: 'connected' });
                this.emit({ type: 'notice', message: null });
                this.emitParticipants();
            })
            .on(RoomEvent.MediaDevicesError, (error: Error) =>
                this.emit({ type: 'notice', message: microphoneError(error) }),
            )
            .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => this.onDisconnected(reason));
    }

    /**
     * The instructor changed somebody's microphone access. Everyone gets the
     * new participant list; the affected student stops or starts publishing
     * here so the browser and the call server agree without a second click.
     */
    private applyPermissionChange(participant: Participant): void {
        const room = this.room;

        if (room === null) {
            return;
        }

        const isLocal = participant.identity === room.localParticipant.identity;
        const canPublish = participant.permissions?.canPublish === true;

        this.emitParticipants();

        if (!isLocal) {
            return;
        }

        if (!canPublish) {
            // Muting is not enough. LiveKit checks canPublish only when a track
            // is first published, so a track already on the wire keeps sending
            // audio after the permission is withdrawn. Leaving the microphone
            // on while packets still flow is exactly what this gate prevents, so
            // the track comes off the room and the capture device is released.
            void this.silenceAll();

            return;
        }

        if (this.options.role === 'participant' && !room.localParticipant.isMicrophoneEnabled) {
            void this.setMicrophone(true);
        }
    }

    /**
     * Stop publishing every outgoing track and release the capture devices.
     *
     * This is the "your microphone was taken back" path. After it the browser
     * holds no live track at all: nothing to leak, and the microphone indicator
     * in the browser really goes out.
     *
     * The epoch is bumped before anything is awaited. Publishing is async, and a
     * grant that was already in flight when the instructor clicked "take back"
     * would otherwise finish afterwards and quietly republish the microphone.
     * setMicrophone checks the epoch before it publishes, so a late grant loses.
     */
    private async silenceAll(): Promise<void> {
        const room = this.room;

        this.publishEpoch += 1;
        this.emit({ type: 'microphone', enabled: false });
        this.emit({ type: 'screenShare', enabled: false });

        if (room === null) {
            return;
        }

        await this.leaveTrack(room, Track.Source.Microphone);
        await this.leaveTrack(room, Track.Source.ScreenShare);
        await this.leaveTrack(room, Track.Source.ScreenShareAudio);

        this.emitParticipants();
    }

    private onDisconnected(reason?: DisconnectReason): void {
        // A recording must survive the room going away. MediaRecorder holds its
        // own streams, so it can still finish and hand the file over.
        void this.stopRecording();

        this.emit({ type: 'status', status: 'disconnected' });
        this.emit({ type: 'participants', participants: [] });
        this.emit({ type: 'microphone', enabled: false });
        this.emit({ type: 'screenShare', enabled: false });
        this.emit({ type: 'audio', blocked: false });

        const message = disconnectReasonMessage(reason === undefined ? undefined : DisconnectReason[reason]);

        if (message !== null) {
            this.emit({ type: 'ended', reason: message });
        }
    }

    private receive(raw: Uint8Array, participant: Participant | undefined, topic: string): void {
        if (topic === BOARD_TOPIC) {
            const message = decodeBoardMessage(raw);

            if (message !== null) {
                this.emit({ type: 'board', message, sender: this.senderOf(participant) });
            }

            return;
        }

        if (topic === PRESENCE_TOPIC) {
            const frame = decodePresence(raw);

            if (frame !== null) {
                this.emit({ type: 'presence', frame });
            }

            return;
        }

        if (topic === CALL_TOPIC) {
            const message = decodeCallMessage(raw);

            if (message !== null) {
                this.emit({ type: 'comment', message, sender: this.senderOf(participant) });
            }
        }
    }

    private senderOf(participant: Participant | undefined): FrameSender {
        return {
            identity: participant?.identity ?? null,
            name: participant?.name ?? null,
            role: roleFromMetadata(participant?.metadata),
        };
    }

    private canPublish(participant: Participant): boolean {
        return participant.permissions?.canPublish === true || this.options.role === 'host';
    }

    private screenShareOf(participant: Participant): MediaStreamTrack | null {
        const track = participant.getTrackPublication(Track.Source.ScreenShare)?.track?.mediaStreamTrack ?? null;

        return track !== null && track.readyState === 'live' ? track : null;
    }

    private emitScreenShareState(): void {
        this.emit({ type: 'screenShare', enabled: this.room?.localParticipant.isScreenShareEnabled ?? false });
    }

    private emitParticipants(): void {
        const room = this.room;

        if (room === null) {
            this.emit({ type: 'participants', participants: [] });

            return;
        }

        const view = (participant: Participant, fallback: 'host' | 'participant'): CallParticipant => {
            const role = roleFromMetadata(participant.metadata) ?? fallback;

            return {
                identity: participant.identity,
                name: participant.name || participant.identity,
                isLocal: participant.identity === room.localParticipant.identity,
                isSpeaking: participant.isSpeaking,
                micEnabled: participant.isMicrophoneEnabled,
                canPublish: participant.permissions?.canPublish ?? role === 'host',
                screenShare: this.screenShareOf(participant),
                role,
            };
        };

        this.emit({
            type: 'participants',
            participants: [
                view(room.localParticipant, this.options.role),
                ...Array.from(room.remoteParticipants.values()).map((participant) =>
                    view(participant, 'participant'),
                ),
            ],
        });
    }

    // -- microphone --------------------------------------------------------

    /** Ask once, before connecting, so a blocked microphone is said out loud. */
    private async askForMicrophone(): Promise<string | null> {
        if (!this.options.secureContext) {
            return 'Joined without a microphone: this address is not a secure origin, so the browser blocks it.';
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());

            return null;
        } catch (error) {
            return `Joining muted. ${microphoneError(error)}`;
        }
    }

    // -- connection --------------------------------------------------------

    private async connectWithRetry(room: Room, grant: CallGrant): Promise<void> {
        for (let attempt = 1; ; attempt += 1) {
            try {
                await this.connectOnce(room, grant);

                return;
            } catch (error) {
                if (attempt >= 2) {
                    throw error;
                }

                this.emit({ type: 'notice', message: 'The call server did not answer. Retrying once…' });
                await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS));
            }
        }
    }

    private async connectOnce(room: Room, grant: CallGrant): Promise<void> {
        let watchdog: number | undefined;

        try {
            await Promise.race([
                room.connect(grant.url, grant.token, { autoSubscribe: true }),
                new Promise<never>((_, reject) => {
                    watchdog = window.setTimeout(
                        () =>
                            reject(
                                new Error(
                                    `The call server did not answer within 25 seconds. Check that ${grant.url} is reachable from this device.`,
                                ),
                            ),
                        CONNECT_TIMEOUT_MS,
                    );
                }),
            ]);
        } finally {
            if (watchdog !== undefined) {
                window.clearTimeout(watchdog);
            }
        }
    }

    private async abort(): Promise<void> {
        await this.stopRecording().catch(() => null);

        const room = this.room;

        this.room = null;
        this.releaseAudioHost();
        this.stopWatchingConnections?.();
        this.stopWatchingConnections = null;
        this.stopWatchingResize?.();
        this.stopWatchingResize = null;

        if (this.qualityTimer !== null) {
            window.clearTimeout(this.qualityTimer);
            this.qualityTimer = null;
        }

        try {
            await room?.disconnect();
        } catch {
            /* the room is being thrown away either way */
        }
    }

    // -- playback ----------------------------------------------------------

    /**
     * Remote microphones are attached to hidden elements that this transport
     * owns, so the page never has to render or track an audio element.
     */
    private attachAudio(track: RemoteTrack): void {
        if (track.kind !== Track.Kind.Audio) {
            return;
        }

        const element = track.attach();
        element.dataset.cognitaAudio = track.sid ?? 'audio';
        this.audioHostElement().appendChild(element);
    }

    private detachAudio(track: RemoteTrack): void {
        for (const element of track.detach()) {
            element.remove();
        }
    }

    private audioHostElement(): HTMLDivElement {
        if (this.audioHost === null) {
            const host = document.createElement('div');
            host.setAttribute('data-cognita-audio', '');
            host.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
            document.body.appendChild(host);
            this.audioHost = host;
        }

        return this.audioHost;
    }

    private releaseAudioHost(): void {
        this.audioHost?.remove();
        this.audioHost = null;
    }

    // -- plumbing ----------------------------------------------------------

    private publish(topic: string, payload: unknown, reliable: boolean): void {
        const room = this.room;

        if (room === null) {
            return;
        }

        void room.localParticipant
            .publishData(encodeFrame(payload), { reliable, topic })
            .catch(() => {
                /* a dropped frame is cheaper than a broken call */
            });
    }

    private emit(event: TransportEvent): void {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}
