import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Copy,
    HandPalm,
    Info,
    Microphone,
    MicrophoneSlash,
    PhoneDisconnect,
    Spinner,
    SquaresFour,
    Users,
    X,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ConnectionState,
    DisconnectReason,
    Room as LiveKitRoom,
    RoomEvent,
    Track,
    type Participant,
    type RemoteAudioTrack,
} from 'livekit-client';
import BoardStage from '@/components/board/BoardStage';
import BoardToolbar from '@/components/board/BoardToolbar';
import type { BoardTool } from '@/components/board/BoardToolbar';
import ParticipantTile from '@/components/call/ParticipantTile';
import { cn, copyText, pluralize } from '@/lib/utils';
import type { BoardState, BoardStroke, BoardSurface } from '@/types';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

interface RoomPageProps {
    classroom: {
        id: number;
        name: string;
        join_code: string;
        course: string | null;
        instructor: string | null;
    };
    role: 'host' | 'participant';
    board: BoardState;
    canEditBoard: boolean;
    canManageBoard: boolean;
    room: string;
    configured: boolean;
    tokenUrl: string;
    boardUrl: string;
    boardPdfUrl: string;
    backUrl: string;
}

interface TokenPayload {
    url: string;
    token: string;
    room: string;
    identity: string;
    role: 'host' | 'participant';
    expires_at: string;
}

interface ParticipantView {
    identity: string;
    name: string;
    isLocal: boolean;
    isSpeaking: boolean;
    micEnabled: boolean;
    role: 'host' | 'participant';
}

/** Who sent a realtime frame; only a host may steer the board. */
type SenderRole = 'host' | 'participant';

/** Realtime board messages travel over the LiveKit data channel. */
type BoardMessage =
    | { type: 'state'; board: BoardState }
    | { type: 'stroke'; stroke: BoardStroke }
    | { type: 'page'; page: number }
    | { type: 'clear'; page: number };

const BOARD_TOPIC = 'cognita.board';

/** Keeps one stable participant identity per browser tab across reloads. */
const SESSION_KEY = 'cognita.call.session';

function callSession(): string {
    const create = (): string => Math.random().toString(36).slice(2, 11).padEnd(6, '0');

    try {
        const stored = window.sessionStorage.getItem(SESSION_KEY);

        if (stored !== null && /^[a-z0-9]{6,16}$/.test(stored)) {
            return stored;
        }

        const created = create();
        window.sessionStorage.setItem(SESSION_KEY, created);

        return created;
    } catch {
        return create();
    }
}

/** Why the server ended the session, in classroom language. */
function disconnectMessage(reason: DisconnectReason | undefined): string | null {
    switch (reason) {
        case DisconnectReason.DUPLICATE_IDENTITY:
            return 'This class was just opened somewhere else on this account. Rejoin here to take the seat back.';
        case DisconnectReason.PARTICIPANT_REMOVED:
            return 'You were removed from the call.';
        case DisconnectReason.ROOM_DELETED:
        case DisconnectReason.ROOM_CLOSED:
            return 'The call was closed. Rejoin to start a new one.';
        case DisconnectReason.SERVER_SHUTDOWN:
            return 'The call server restarted. Rejoin to continue.';
        case DisconnectReason.SIGNAL_CLOSE:
            return 'The connection to the call server was lost. Rejoin to continue.';
        case DisconnectReason.CONNECTION_TIMEOUT:
        case DisconnectReason.MEDIA_FAILURE:
            return 'The audio connection could not be established: the call server never received media from this device. UDP 7882 is blocked somewhere between this device and the server — test from the same machine first, or open UDP 7882 on the call server host.';
        case DisconnectReason.JOIN_FAILURE:
        case DisconnectReason.STATE_MISMATCH:
            return 'The call server rejected this session. Reload the page and rejoin.';
        case DisconnectReason.CLIENT_INITIATED:
            return null;
        default:
            return null;
    }
}

/** Which step of joining is running, so the lobby never looks frozen. */
type JoinPhase = 'permission' | 'signal' | 'media';

const joinPhaseLabel: Record<JoinPhase, string> = {
    permission: 'Waiting for microphone permission…',
    signal: 'Contacting the call server…',
    media: 'Negotiating the audio connection…',
};

/** LiveKit reports an ICE failure as a bare "could not connect PC". */
function joinErrorMessage(caught: unknown): string {
    const raw = caught instanceof Error ? caught.message : String(caught);

    if (/could not connect pc|failed to establish|pc connection|ice|timeout/i.test(raw)) {
        return 'The call server answered, but the audio connection could not be established. The media port (UDP 7882) is not reachable between this device and the server — run .dev/livekit.sh on the server machine, or open UDP 7882.';
    }

    return raw === '' ? 'Could not join the call.' : raw;
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function micErrorMessage(caught: unknown): string {
    if (caught instanceof DOMException) {
        if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(caught.name)) {
            return 'Microphone access is blocked for this site. Allow it in the browser settings, or open this page over HTTPS.';
        }

        if (caught.name === 'NotFoundError') {
            return 'No microphone was found on this device.';
        }

        if (['NotReadableError', 'TrackStartError'].includes(caught.name)) {
            return 'The microphone is busy in another app.';
        }
    }

    return 'The microphone could not be started.';
}

function roleFromMetadata(metadata: string | undefined): 'host' | 'participant' | null {
    if (!metadata) {
        return null;
    }

    try {
        const parsed = JSON.parse(metadata) as { role?: string };

        return parsed.role === 'host' ? 'host' : parsed.role === 'participant' ? 'participant' : null;
    } catch {
        return null;
    }
}

const surfaceLabel: Record<BoardSurface, string> = {
    canvas: 'Canvas',
    notebook: 'Notebook',
    pdf: 'PDF',
};

export default function LiveCallRoom({
    classroom,
    role,
    board: initialBoard,
    canEditBoard,
    canManageBoard,
    room: roomName,
    configured,
    tokenUrl,
    boardUrl,
    boardPdfUrl,
    backUrl,
}: RoomPageProps) {
    const roomRef = useRef<LiveKitRoom | null>(null);
    const boardRef = useRef<BoardState>(initialBoard);
    const saveTimer = useRef<number | null>(null);
    const pendingPatch = useRef<Record<string, unknown>>({});
    const decoder = useRef(new TextDecoder());
    const encoder = useRef(new TextEncoder());

    const [status, setStatus] = useState<CallStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [phase, setPhase] = useState<JoinPhase | null>(null);
    const [audioBlocked, setAudioBlocked] = useState(false);
    const [participants, setParticipants] = useState<ParticipantView[]>([]);
    const [audioTracks, setAudioTracks] = useState<RemoteAudioTrack[]>([]);
    const [micEnabled, setMicEnabled] = useState(false);

    const [board, setBoard] = useState<BoardState>(initialBoard);
    const [boardOpen, setBoardOpen] = useState(false);
    const [panel, setPanel] = useState<'none' | 'people'>('none');
    const [uploading, setUploading] = useState(false);

    const [tool, setTool] = useState<BoardTool>('pen');
    const [color, setColor] = useState('#191c20');
    const [width, setWidth] = useState(0.004);

    const [copied, setCopied] = useState(false);
    const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false;

    const connected = status === 'connected';
    const reconnecting = status === 'reconnecting';

    // The stage stays mounted through a reconnect so a blip does not throw the
    // room away; only a real disconnect returns to the lobby.
    const inCall = connected || reconnecting;
    const joining = status === 'connecting';

    const commitBoard = useCallback((next: BoardState) => {
        boardRef.current = next;
        setBoard(next);
    }, []);

    // --- Board persistence ------------------------------------------------
    const flushBoard = useCallback(async (): Promise<void> => {
        const patch = pendingPatch.current;
        pendingPatch.current = {};

        if (Object.keys(patch).length === 0) {
            return;
        }

        try {
            await fetch(boardUrl, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify(patch),
            });
        } catch {
            // The board stays usable locally; the next edit retries the save.
        }
    }, [boardUrl]);

    const queueSave = useCallback(
        (patch: Record<string, unknown>, immediate = false): void => {
            pendingPatch.current = { ...pendingPatch.current, ...patch };

            if (saveTimer.current !== null) {
                window.clearTimeout(saveTimer.current);
            }

            if (immediate) {
                void flushBoard();

                return;
            }

            saveTimer.current = window.setTimeout(() => void flushBoard(), 800);
        },
        [flushBoard],
    );

    useEffect(() => {
        return () => {
            if (saveTimer.current !== null) {
                window.clearTimeout(saveTimer.current);
            }
        };
    }, []);

    // --- Broadcast --------------------------------------------------------
    const broadcast = useCallback((message: BoardMessage): void => {
        const room = roomRef.current;

        if (room === null || room.state !== ConnectionState.Connected) {
            return;
        }

        void room.localParticipant.publishData(encoder.current.encode(JSON.stringify(message)), {
            reliable: true,
            topic: BOARD_TOPIC,
        });
    }, []);

    const broadcastState = useCallback(
        (next: BoardState) => {
            broadcast({ type: 'state', board: next });
        },
        [broadcast],
    );

    // --- Board actions ----------------------------------------------------
    function handleStroke(stroke: BoardStroke): void {
        const current = boardRef.current;

        if (!canEditBoard) {
            return;
        }

        const strokes = [...current.strokes, stroke].sort((a, b) => a.id - b.id);
        const next = { ...current, strokes };

        commitBoard(next);
        broadcast({ type: 'stroke', stroke });
        queueSave({ strokes });
    }

    function handleSurface(surface: BoardSurface): void {
        if (!canManageBoard) {
            return;
        }

        const current = boardRef.current;
        const next: BoardState = {
            ...current,
            surface,
            title: surfaceLabel[surface],
            pages: surface === 'pdf' ? Math.max(1, current.document?.pages ?? 1) : surface === 'notebook' ? 8 : 1,
            page: Math.min(current.page, surface === 'pdf' ? Math.max(1, current.document?.pages ?? 1) : surface === 'notebook' ? 8 : 1),
        };

        commitBoard(next);
        broadcastState(next);
        queueSave({ surface }, true);
    }

    function handlePage(page: number): void {
        if (!canManageBoard) {
            return;
        }

        const current = boardRef.current;
        const next = { ...current, page };

        commitBoard(next);
        broadcast({ type: 'page', page });
        queueSave({ page }, true);
    }

    function handleToggleStudents(): void {
        if (!canManageBoard) {
            return;
        }

        const current = boardRef.current;
        const next = { ...current, studentsCanAnnotate: !current.studentsCanAnnotate };

        commitBoard(next);
        broadcastState(next);
        queueSave({ students_can_annotate: next.studentsCanAnnotate }, true);
    }

    function handleClear(): void {
        if (!canManageBoard) {
            return;
        }

        const current = boardRef.current;
        const page = current.page;
        const strokes = current.strokes.filter((stroke) => stroke.page !== page);

        commitBoard({ ...current, strokes });
        broadcast({ type: 'clear', page });
        queueSave({ strokes }, true);
    }

    const handlePageCount = useCallback(
        (pages: number): void => {
            const current = boardRef.current;

            if (current.surface !== 'pdf' || pages < 1) {
                return;
            }

            if (current.pages === pages) {
                return;
            }

            const next: BoardState = {
                ...current,
                pages,
                document: current.document === null ? null : { ...current.document, pages },
            };

            commitBoard(next);

            if (canManageBoard) {
                broadcastState(next);
                queueSave({ pages }, true);
            }
        },
        [broadcastState, canManageBoard, commitBoard, queueSave],
    );

    async function uploadPdf(file: File): Promise<void> {
        if (!canManageBoard) {
            return;
        }

        setUploading(true);
        setNotice(null);

        try {
            const body = new FormData();
            body.append('document', file);

            const response = await fetch(boardPdfUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body,
            });

            if (!response.ok) {
                setNotice('That file could not be uploaded. PDFs up to 25 MB only.');

                return;
            }

            const payload = (await response.json()) as { data: BoardState };

            commitBoard(payload.data);
            broadcastState(payload.data);
        } catch {
            setNotice('That file could not be uploaded. Try again.');
        } finally {
            setUploading(false);
        }
    }

    // --- LiveKit ----------------------------------------------------------
    const refresh = useCallback((): void => {
        const room = roomRef.current;

        if (room === null) {
            return;
        }

        const toView = (participant: Participant, fallback: 'host' | 'participant'): ParticipantView => ({
            identity: participant.identity,
            name: participant.name || participant.identity,
            isLocal: participant.identity === room.localParticipant.identity,
            isSpeaking: participant.isSpeaking,
            micEnabled: participant.isMicrophoneEnabled,
            role: roleFromMetadata(participant.metadata) ?? fallback,
        });

        const next = [
            toView(room.localParticipant, role),
            ...Array.from(room.remoteParticipants.values()).map((participant) => toView(participant, 'participant')),
        ];

        const tracks: RemoteAudioTrack[] = [];

        for (const participant of room.remoteParticipants.values()) {
            for (const publication of participant.trackPublications.values()) {
                const track = publication.track;

                if (track !== undefined && track.kind === Track.Kind.Audio) {
                    tracks.push(track as RemoteAudioTrack);
                }
            }
        }

        setParticipants(next);
        setAudioTracks(tracks);
        setMicEnabled(room.localParticipant.isMicrophoneEnabled);
        setAudioBlocked(!room.canPlaybackAudio);
    }, [role]);

    const applyRemote = useCallback(
        (message: BoardMessage, sender: SenderRole): void => {
            const current = boardRef.current;

            // Students own strokes only; the host steers surface, page and clears.
            if (sender === 'participant') {
                if (message.type !== 'stroke') {
                    return;
                }

                if (!current.studentsCanAnnotate) {
                    return;
                }
            }

            if (message.type === 'state') {
                if (message.board === undefined) {
                    return;
                }

                commitBoard(message.board);

                return;
            }

            if (message.type === 'stroke') {
                if (current.strokes.some((stroke) => stroke.id === message.stroke.id)) {
                    return;
                }

                commitBoard({
                    ...current,
                    strokes: [...current.strokes, message.stroke].sort((a, b) => a.id - b.id),
                });

                return;
            }

            if (message.type === 'page') {
                commitBoard({ ...current, page: message.page });

                return;
            }

            if (message.type === 'clear') {
                commitBoard({ ...current, strokes: current.strokes.filter((stroke) => stroke.page !== message.page) });
            }
        },
        [commitBoard],
    );

    useEffect(() => {
        return () => {
            void roomRef.current?.disconnect();
            roomRef.current = null;
        };
    }, []);

    async function joinCall(): Promise<void> {
        if (joining || inCall) {
            return;
        }

        setStatus('connecting');
        setError(null);
        setNotice(null);
        setPhase('permission');

        if (!secureContext) {
            setNotice('Joined without a microphone: this address is not a secure origin, so the browser blocks it.');
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach((track) => track.stop());
            } catch (caught) {
                setNotice(`Joining muted. ${micErrorMessage(caught)}`);
            }
        }

        setPhase('signal');

        try {
            const payload = await requestToken(tokenUrl, callSession());
            const room = new LiveKitRoom({
                adaptiveStream: true,
                dynacast: true,
                audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });

            roomRef.current = room;

            const resync = (): void => {
                refresh();

                // A late joiner boots from a server snapshot that may already be
                // stale, so hand it the live board as soon as it connects.
                if (canManageBoard) {
                    broadcastState(boardRef.current);
                }
            };

            room.on(RoomEvent.ParticipantConnected, resync)
                .on(RoomEvent.ParticipantDisconnected, refresh)
                .on(RoomEvent.ActiveSpeakersChanged, refresh)
                .on(RoomEvent.ParticipantMetadataChanged, refresh)
                .on(RoomEvent.TrackMuted, refresh)
                .on(RoomEvent.TrackUnmuted, refresh)
                .on(RoomEvent.TrackSubscribed, refresh)
                .on(RoomEvent.TrackUnsubscribed, refresh)
                .on(RoomEvent.LocalTrackPublished, refresh)
                .on(RoomEvent.LocalTrackUnpublished, refresh)
                .on(RoomEvent.AudioPlaybackStatusChanged, refresh)
                .on(RoomEvent.SignalConnected, () => setPhase('media'));

            room.on(RoomEvent.DataReceived, (payloadBytes, participant, _kind, topic) => {
                if (topic !== BOARD_TOPIC) {
                    return;
                }

                const sender = roleFromMetadata(participant?.metadata) ?? 'participant';

                try {
                    applyRemote(JSON.parse(decoder.current.decode(payloadBytes)) as BoardMessage, sender);
                } catch {
                    // Ignore malformed frames rather than dropping the call.
                }
            });

            room.on(RoomEvent.ConnectionStateChanged, (state) => {
                if (state === ConnectionState.Connected) {
                    setStatus('connected');
                }

                if (state === ConnectionState.Reconnecting) {
                    setStatus('reconnecting');
                }
            });

            room.on(RoomEvent.Reconnecting, () => {
                setStatus('reconnecting');
                setNotice('Connection dropped. Reconnecting…');
            });

            room.on(RoomEvent.Reconnected, () => {
                setStatus('connected');
                setNotice(null);
                refresh();

                if (canManageBoard) {
                    broadcastState(boardRef.current);
                }
            });

            room.on(RoomEvent.MediaDevicesError, (caught: Error) => setNotice(micErrorMessage(caught)));

            room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
                setStatus('disconnected');
                setParticipants([]);
                setAudioTracks([]);
                setMicEnabled(false);
                setAudioBlocked(false);

                const message = disconnectMessage(reason);

                if (message !== null) {
                    setError(message);
                }
            });

            // A wedged WebSocket or a blocked media port leaves connect()
            // pending forever; fail loudly instead of sitting in "Joining…".
            let watchdog: number | undefined;

            try {
                await Promise.race([
                    room.connect(payload.url, payload.token, { autoSubscribe: true }),
                    new Promise<never>((_, reject) => {
                        watchdog = window.setTimeout(
                            () =>
                                reject(
                                    new Error(
                                        'The call server did not answer within 25 seconds. Check that the LiveKit URL is reachable from this device and that UDP 7882 is open.',
                                    ),
                                ),
                            25_000,
                        );
                    }),
                ]);
            } finally {
                if (watchdog !== undefined) {
                    window.clearTimeout(watchdog);
                }
            }

            setStatus('connected');
            setPhase(null);
            refresh();

            void room.startAudio().then(
                () => setAudioBlocked(!room.canPlaybackAudio),
                () => setAudioBlocked(true),
            );

            try {
                await room.localParticipant.setMicrophoneEnabled(true);
                setMicEnabled(true);
            } catch (caught) {
                setNotice(`You joined muted. ${micErrorMessage(caught)}`);
            }

            if (canManageBoard) {
                broadcastState(boardRef.current);
            }
        } catch (caught) {
            setStatus('error');
            setPhase(null);
            setError(joinErrorMessage(caught));
            await roomRef.current?.disconnect();
            roomRef.current = null;
        }
    }

    async function toggleMicrophone(): Promise<void> {
        const room = roomRef.current;

        if (room === null) {
            return;
        }

        try {
            await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
            setMicEnabled(room.localParticipant.isMicrophoneEnabled);
            refresh();
        } catch (caught) {
            setNotice(micErrorMessage(caught));
        }
    }

    async function enableAudio(): Promise<void> {
        const room = roomRef.current;

        if (room === null) {
            return;
        }

        try {
            await room.startAudio();
            setAudioBlocked(!room.canPlaybackAudio);
        } catch {
            setNotice('Could not start audio playback.');
        }
    }

    async function leaveCall(): Promise<void> {
        const room = roomRef.current;
        roomRef.current = null;
        setStatus('idle');
        setParticipants([]);
        setAudioTracks([]);
        setMicEnabled(false);
        setAudioBlocked(false);
        setBoardOpen(false);

        if (saveTimer.current !== null) {
            window.clearTimeout(saveTimer.current);
        }

        await flushBoard();
        await room?.disconnect();
    }

    async function copyKey(): Promise<void> {
        if (await copyText(classroom.join_code)) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        }
    }

    const participantCount = participants.length;
    const canDraw = canEditBoard && (canManageBoard || board.studentsCanAnnotate);

    return (
        <>
            <Head title={`${classroom.name} · Live call`} />

            <div className="call-shell">
                <header className="flex h-14 shrink-0 items-center gap-3 border-b border-stage-line px-3 sm:px-4">
                    <Link
                        href={backUrl}
                        className="call-control h-9 min-w-9 px-2"
                        aria-label="Leave this view"
                        title="Back to the class list"
                    >
                        <ArrowLeft size={17} aria-hidden="true" />
                    </Link>

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-white">{classroom.name}</p>
                        <p className="truncate text-[11px] text-white/50">
                            {[classroom.course, classroom.instructor].filter(Boolean).join(' · ') || 'Live class'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => void copyKey()}
                        className="call-control h-8 px-2.5 text-[11px]"
                        title="Copy the class key"
                    >
                        <span className="font-mono tracking-[0.18em]">{classroom.join_code}</span>
                        {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    </button>

                    {inCall ? (
                        <span className={cn('stage-chip hidden sm:inline-flex', reconnecting ? 'stage-chip-warn' : 'stage-chip-live')}>
                            <span
                                className={cn('h-1.5 w-1.5 rounded-full', reconnecting ? 'bg-[#ffd28a]' : 'bg-[#8ce8b0]')}
                                aria-hidden="true"
                            />
                            {reconnecting ? 'Reconnecting' : 'Live'}
                        </span>
                    ) : null}

                    <span className="hidden items-center gap-1.5 text-[11px] text-white/55 sm:flex">
                        <Users size={14} aria-hidden="true" />
                        {participantCount}
                    </span>
                </header>

                <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                    <main className="flex min-h-0 flex-1 flex-col">
                        {notice || error || !configured ? (
                            <div className="flex flex-col gap-1.5 px-3 pt-3 sm:px-4">
                                {!configured ? (
                                    <p className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                                        <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
                                        Live calls are not configured on this server. Set LIVEKIT_URL,
                                        LIVEKIT_API_KEY and LIVEKIT_API_SECRET, then reload.
                                    </p>
                                ) : null}
                                {error ? (
                                    <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-[#ffb4ab]" role="alert">
                                        {error}
                                    </p>
                                ) : null}
                                {notice ? (
                                    <p className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70" role="status">
                                        {notice}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {inCall ? (
                            <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3 sm:p-4">
                                {boardOpen ? (
                                    <div className="flex min-h-0 flex-1 flex-col gap-2.5 lg:flex-row">
                                        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
                                            <BoardToolbar
                                                surface={board.surface}
                                                page={board.page}
                                                pages={board.pages}
                                                canManage={canManageBoard}
                                                canDraw={canDraw}
                                                hasDocument={board.document !== null}
                                                uploading={uploading}
                                                tool={tool}
                                                color={color}
                                                width={width}
                                                studentsCanAnnotate={board.studentsCanAnnotate}
                                                onSurface={handleSurface}
                                                onPage={handlePage}
                                                onUpload={(file) => void uploadPdf(file)}
                                                onClear={handleClear}
                                                onTool={setTool}
                                                onColor={setColor}
                                                onWidth={setWidth}
                                                onToggleStudents={handleToggleStudents}
                                            />
                                            <div className="min-h-[280px] flex-1 lg:min-h-0">
                                                <BoardStage
                                                    surface={board.surface}
                                                    documentUrl={board.document?.url ?? null}
                                                    page={board.page}
                                                    strokes={board.strokes}
                                                    canDraw={canDraw}
                                                    tool={tool}
                                                    color={color}
                                                    width={width}
                                                    onStroke={handleStroke}
                                                    onPageCount={handlePageCount}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:w-[190px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0">
                                            {participants.map((participant) => (
                                                <ParticipantTile key={participant.identity} participant={participant} layout="strip" />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex min-h-0 flex-1 items-center justify-center">
                                        <div className="grid w-full max-w-4xl grid-cols-2 gap-2.5 sm:grid-cols-3">
                                            {participants.map((participant) => (
                                                <ParticipantTile key={participant.identity} participant={participant} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {audioTracks.map((track, index) => (
                                    <RemoteAudio key={track.sid ?? `audio-${index}`} track={track} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                                <div className="w-full max-w-md rounded-3xl border border-stage-line bg-stage-raised p-6">
                                    <p className="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                                        {role === 'host' ? 'You are the host' : 'Group call'}
                                    </p>
                                    <h1 className="mt-2 text-xl font-semibold text-white">{classroom.name}</h1>
                                    <p className="mt-1 text-sm text-white/55">
                                        {classroom.instructor ? `With ${classroom.instructor}` : 'Class group call'} · every
                                        participant shares one microphone room and one board.
                                    </p>

                                    <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                                        <span className="text-[11px] text-white/45">Class key</span>
                                        <span className="ml-auto font-mono text-sm font-semibold tracking-[0.2em] text-white">
                                            {classroom.join_code}
                                        </span>
                                    </div>

                                    {!secureContext ? (
                                        <p className="mt-3 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[11px] text-warn">
                                            <Info size={13} className="mt-px shrink-0" aria-hidden="true" />
                                            Open this page over HTTPS (or a trusted origin) to use the microphone. The board
                                            still works.
                                        </p>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={() => void joinCall()}
                                        disabled={!configured || joining}
                                        className="btn btn-primary mt-5 w-full py-3"
                                    >
                                        <Microphone size={17} weight="duotone" aria-hidden="true" />
                                        {joining ? 'Joining…' : status === 'disconnected' ? 'Rejoin call' : 'Join call'}
                                    </button>

                                    {joining && phase !== null ? (
                                        <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-white/55">
                                            <Spinner size={13} className="motion-safe:animate-spin" aria-hidden="true" />
                                            {joinPhaseLabel[phase]}
                                        </p>
                                    ) : (
                                        <p className="mt-3 text-center text-[11px] text-white/40">
                                            Your microphone stays off until you allow it.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {inCall ? (
                            <div className="shrink-0 px-3 pb-4 sm:px-4">
                                {audioBlocked && audioTracks.length > 0 ? (
                                    <div className="mb-2 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => void enableAudio()}
                                            className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-stage"
                                        >
                                            Click to enable sound
                                        </button>
                                    </div>
                                ) : null}

                                <div className="callbar mx-auto w-fit">
                                    <button
                                        type="button"
                                        onClick={() => void toggleMicrophone()}
                                        className={cn('call-control', micEnabled ? 'call-control-live' : 'call-control-on')}
                                        aria-pressed={micEnabled}
                                        title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                                    >
                                        {micEnabled ? (
                                            <Microphone size={17} weight="fill" aria-hidden="true" />
                                        ) : (
                                            <MicrophoneSlash size={17} aria-hidden="true" />
                                        )}
                                        <span className="hidden sm:inline">{micEnabled ? 'Mute' : 'Unmute'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setBoardOpen((open) => !open)}
                                        className={cn('call-control', boardOpen && 'call-control-on')}
                                        aria-pressed={boardOpen}
                                        title="Show or hide the shared board"
                                    >
                                        <SquaresFour size={17} weight={boardOpen ? 'fill' : 'regular'} aria-hidden="true" />
                                        <span className="hidden sm:inline">{boardOpen ? 'Hide board' : 'Present'}</span>
                                    </button>

                                    {canManageBoard ? (
                                        <button
                                            type="button"
                                            onClick={handleToggleStudents}
                                            className={cn('call-control', board.studentsCanAnnotate && 'call-control-live')}
                                            aria-pressed={board.studentsCanAnnotate}
                                            title="Let students draw on the board"
                                        >
                                            <HandPalm
                                                size={17}
                                                weight={board.studentsCanAnnotate ? 'fill' : 'regular'}
                                                aria-hidden="true"
                                            />
                                            <span className="hidden sm:inline">
                                                {board.studentsCanAnnotate ? 'Students can draw' : 'Hand over pen'}
                                            </span>
                                        </button>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={() => setPanel((current) => (current === 'people' ? 'none' : 'people'))}
                                        className={cn('call-control', panel === 'people' && 'call-control-on')}
                                        aria-pressed={panel === 'people'}
                                        title="Participants"
                                    >
                                        <Users size={17} aria-hidden="true" />
                                        <span className="tabular">{participantCount}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => void leaveCall()}
                                        className="call-control call-control-danger px-4"
                                        title="Leave the call"
                                    >
                                        <PhoneDisconnect size={17} weight="fill" aria-hidden="true" />
                                        <span className="hidden sm:inline">Leave</span>
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </main>

                    {panel === 'people' ? (
                        <aside className="call-panel" aria-label="Participants">
                            <div className="flex items-center justify-between border-b border-stage-line px-3 py-2.5">
                                <p className="text-[12px] font-semibold text-white">
                                    Participants{' '}
                                    <span className="font-normal text-white/45">
                                        {pluralize(Math.max(participantCount, 1), 'person', 'people')}
                                    </span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setPanel('none')}
                                    className="call-control h-7 min-w-7 px-1"
                                    aria-label="Close participants"
                                >
                                    <X size={14} aria-hidden="true" />
                                </button>
                            </div>

                            <ul className="flex-1 space-y-1 overflow-y-auto p-2">
                                {(participants.length > 0 ? participants : [{ identity: 'you', name: 'You', isLocal: true, isSpeaking: false, micEnabled, role }]).map(
                                    (participant) => (
                                        <li key={participant.identity} className="call-panel-item">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/80">
                                                {participant.name.slice(0, 2).toUpperCase()}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">
                                                {participant.name}
                                                {participant.isLocal ? ' (you)' : ''}
                                            </span>
                                            {participant.role === 'host' ? (
                                                <span className="rounded-full bg-brand/80 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                                    HOST
                                                </span>
                                            ) : null}
                                            {participant.micEnabled ? (
                                                <Microphone size={13} className="text-white/45" aria-label="Unmuted" />
                                            ) : (
                                                <MicrophoneSlash size={13} className="text-white/30" aria-label="Muted" />
                                            )}
                                        </li>
                                    ),
                                )}
                            </ul>

                            <div className="border-t border-stage-line p-3 text-[11px] leading-relaxed text-white/45">
                                Board: <span className="text-white/70">{surfaceLabel[board.surface]}</span>
                                {board.studentsCanAnnotate ? ' · students may draw' : ' · view only for students'}
                            </div>
                        </aside>
                    ) : null}
                </div>
            </div>
        </>
    );
}

function RemoteAudio({ track }: { track: RemoteAudioTrack }) {
    const ref = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const element = ref.current;

        if (element === null) {
            return;
        }

        track.attach(element);

        return () => {
            track.detach(element);
        };
    }, [track]);

    return <audio ref={ref} autoPlay playsInline className="hidden" />;
}

async function requestToken(url: string, session: string): Promise<TokenPayload> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({ session }),
    });

    if (!response.ok) {
        throw new Error(await responseError(response));
    }

    const payload = (await response.json()) as { data: TokenPayload };

    return payload.data;
}

async function responseError(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
        const first = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;

        return first ?? body.message ?? `Could not join the call (${response.status}).`;
    } catch {
        return `Could not join the call (${response.status}).`;
    }
}
