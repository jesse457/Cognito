import { Head, Link } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ConnectionState,
    RemoteAudioTrack,
    Room,
    RoomEvent,
    Track,
    type Participant,
} from 'livekit-client';
import Badge from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

type CallRole = 'host' | 'participant';
type CallStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface LiveClass {
    id: number;
    name: string;
    description: string | null;
    instructor: string | null;
    status: string;
}

interface LiveCallRoomProps {
    class: LiveClass;
    role: CallRole;
    room: string;
    configured: boolean;
    tokenUrl: string;
    backUrl: string;
}

interface TokenPayload {
    url: string;
    token: string;
    room: string;
    identity: string;
    role: CallRole;
    expires_at: string;
}

interface ParticipantView {
    identity: string;
    name: string;
    isLocal: boolean;
    isSpeaking: boolean;
    microphoneEnabled: boolean;
    role: CallRole;
}

const callEvents = [
    RoomEvent.ParticipantConnected,
    RoomEvent.ParticipantDisconnected,
    RoomEvent.ActiveSpeakersChanged,
    RoomEvent.ParticipantMetadataChanged,
    RoomEvent.TrackMuted,
    RoomEvent.TrackUnmuted,
    RoomEvent.TrackSubscribed,
    RoomEvent.TrackUnsubscribed,
    RoomEvent.LocalTrackPublished,
    RoomEvent.LocalTrackUnpublished,
    RoomEvent.AudioPlaybackStatusChanged,
    RoomEvent.ConnectionStateChanged,
];

function microphoneErrorMessage(caught: unknown): string {
    if (caught instanceof DOMException) {
        if (
            caught.name === 'NotAllowedError' ||
            caught.name === 'PermissionDeniedError' ||
            caught.name === 'SecurityError'
        ) {
            return 'Microphone access is blocked. Allow the microphone for this site in Chrome settings and try again.';
        }

        if (caught.name === 'NotFoundError') {
            return 'No microphone was found on this device.';
        }

        if (caught.name === 'NotReadableError' || caught.name === 'TrackStartError') {
            return 'The microphone is busy in another app. Close it and try again.';
        }
    }

    return 'The microphone could not be enabled. Check the browser permissions and try again.';
}

export default function LiveCallRoom({
    class: liveClass,
    role,
    room: roomName,
    configured,
    tokenUrl,
    backUrl,
}: LiveCallRoomProps) {
    const roomRef = useRef<Room | null>(null);
    const [status, setStatus] = useState<CallStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [participants, setParticipants] = useState<ParticipantView[]>([]);
    const [audioTracks, setAudioTracks] = useState<RemoteAudioTrack[]>([]);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
    const [audioBlocked, setAudioBlocked] = useState(false);
    const secureContext = typeof window !== 'undefined' && window.isSecureContext;

    const refresh = useCallback(() => {
        const room = roomRef.current;

        if (room === null) {
            return;
        }

        const toView = (participant: Participant, fallbackRole: CallRole): ParticipantView => ({
            identity: participant.identity,
            name: participant.name || participant.identity,
            isLocal: participant.identity === room.localParticipant.identity,
            isSpeaking: participant.isSpeaking,
            microphoneEnabled: participant.isMicrophoneEnabled,
            role: metadataRole(participant.metadata) ?? fallbackRole,
        });

        const nextParticipants = [
            toView(room.localParticipant, role),
            ...Array.from(room.remoteParticipants.values()).map((participant) =>
                toView(participant, 'participant'),
            ),
        ];

        const nextTracks: RemoteAudioTrack[] = [];

        for (const participant of room.remoteParticipants.values()) {
            for (const publication of participant.trackPublications.values()) {
                const track = publication.track;

                if (track !== undefined && track.kind === Track.Kind.Audio) {
                    nextTracks.push(track as RemoteAudioTrack);
                }
            }
        }

        setParticipants(nextParticipants);
        setAudioTracks(nextTracks);
        setMicrophoneEnabled(room.localParticipant.isMicrophoneEnabled);
        setAudioBlocked(!room.canPlaybackAudio);
    }, [role]);

    useEffect(() => {
        return () => {
            void roomRef.current?.disconnect();
            roomRef.current = null;
        };
    }, []);

    async function joinCall(): Promise<void> {
        if (status === 'connecting' || status === 'connected') {
            return;
        }

        setStatus('connecting');
        setError(null);
        setNotice(null);

        if (!secureContext) {
            setNotice(
                'This page is not a secure origin, so Chrome will not allow microphone access. Use HTTPS or treat this address as secure in Chrome flags.',
            );
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach((track) => track.stop());
            } catch (caught) {
                setNotice(`Joining muted. ${microphoneErrorMessage(caught)}`);
            }
        }

        try {
            const payload = await requestToken(tokenUrl);
            const room = new Room({
                adaptiveStream: true,
                dynacast: true,
                audioCaptureDefaults: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            roomRef.current = room;

            for (const event of callEvents) {
                room.on(event, refresh);
            }

            room.on(RoomEvent.ConnectionStateChanged, (state) => {
                if (state === ConnectionState.Connected) {
                    setStatus('connected');
                }
            });

            room.on(RoomEvent.Reconnecting, () => {
                setNotice('The connection dropped. Reconnecting…');
            });

            room.on(RoomEvent.Reconnected, () => {
                setNotice(null);
                setStatus('connected');
                refresh();
            });

            room.on(RoomEvent.Disconnected, () => {
                setStatus('disconnected');
                setParticipants([]);
                setAudioTracks([]);
                setMicrophoneEnabled(false);
                setAudioBlocked(false);
            });

            await room.connect(payload.url, payload.token, { autoSubscribe: true });
            setStatus('connected');
            refresh();

            void room.startAudio().then(
                () => setAudioBlocked(!room.canPlaybackAudio),
                () => setAudioBlocked(true),
            );

            try {
                await room.localParticipant.setMicrophoneEnabled(true);
                setMicrophoneEnabled(true);
            } catch (caught) {
                setNotice(`You joined muted. ${microphoneErrorMessage(caught)}`);
            }
        } catch (caught) {
            setStatus('error');
            setError(caught instanceof Error ? caught.message : 'Could not join the voice call.');
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
            setMicrophoneEnabled(room.localParticipant.isMicrophoneEnabled);
            refresh();
        } catch (caught) {
            setNotice(microphoneErrorMessage(caught));
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
            setNotice('Could not start audio playback. Check your browser audio settings.');
        }
    }

    async function leaveCall(): Promise<void> {
        const room = roomRef.current;
        roomRef.current = null;
        setStatus('idle');
        setParticipants([]);
        setAudioTracks([]);
        setMicrophoneEnabled(false);
        setAudioBlocked(false);
        setNotice(null);

        await room?.disconnect();
    }

    const connected = status === 'connected';
    const joining = status === 'connecting';

    return (
        <>
            <Head title={`${liveClass.name} · Voice call`} />

            <div className="min-h-[100dvh] bg-zinc-50">
                <header className="border-b border-zinc-200 bg-white">
                    <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <Link href={backUrl} className="btn btn-ghost btn-sm">
                            ← Back
                        </Link>
                        <div className="min-w-0 text-center">
                            <p className="truncate text-sm font-semibold text-zinc-900">{liveClass.name}</p>
                            <p className="meta">
                                Group voice call
                                {liveClass.instructor ? ` · ${liveClass.instructor}` : ''}
                            </p>
                        </div>
                        <Badge tone={role === 'host' ? 'accent' : 'info'}>{role === 'host' ? 'Host' : 'Student'}</Badge>
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
                    {!configured ? (
                        <Card>
                            <CardHeader
                                title="Live calls are not configured"
                                description="Add the LiveKit environment variables and start the LiveKit server before joining."
                            />
                            <CardBody>
                                <p className="text-sm text-zinc-600">
                                    Set <code className="font-mono text-[12px]">LIVEKIT_URL</code>,{' '}
                                    <code className="font-mono text-[12px]">LIVEKIT_API_KEY</code> and{' '}
                                    <code className="font-mono text-[12px]">LIVEKIT_API_SECRET</code>, then reload this page.
                                </p>
                            </CardBody>
                        </Card>
                    ) : null}

                    {!secureContext ? (
                        <div className="flash flash-error" role="alert">
                            <strong>Microphone access is blocked on this address.</strong> Chrome only allows microphone use
                            on HTTPS pages or origins you explicitly trust. Open this page over HTTPS, or add this
                            address to Chrome&apos;s insecure-origin flag and relaunch the browser.
                        </div>
                    ) : null}

                    {error ? (
                        <div className="flash flash-error" role="alert">
                            {error}
                        </div>
                    ) : null}

                    {notice ? (
                        <div className="flash flash-info" role="status">
                            {notice}
                        </div>
                    ) : null}

                    {connected ? (
                        <Card>
                            <CardHeader
                                title="In the call"
                                description={`${participants.length} ${participants.length === 1 ? 'participant' : 'participants'} connected to ${roomName}.`}
                                actions={<Badge tone="success">Connected</Badge>}
                            />
                            <CardBody>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {participants.map((participant) => (
                                        <ParticipantTile key={participant.identity} participant={participant} />
                                    ))}
                                </div>

                                {audioTracks.map((track) => (
                                    <RemoteAudio key={track.sid ?? track.mediaStreamID} track={track} />
                                ))}
                            </CardBody>
                            <div className="card-footer flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    className={cn('btn', microphoneEnabled ? 'btn-secondary' : 'btn-primary')}
                                    onClick={toggleMicrophone}
                                >
                                    {microphoneEnabled ? <MicrophoneIcon /> : <MicrophoneOffIcon />}
                                    {microphoneEnabled ? 'Mute' : 'Unmute'}
                                </button>
                                {audioBlocked && audioTracks.length > 0 ? (
                                    <button type="button" className="btn btn-secondary" onClick={() => void enableAudio()}>
                                        Enable sound
                                    </button>
                                ) : null}
                                <button type="button" className="btn btn-danger" onClick={() => void leaveCall()}>
                                    Leave call
                                </button>
                                <span className="meta ml-auto">
                                    {microphoneEnabled ? 'Your microphone is live.' : 'You are muted.'}
                                </span>
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader
                                title={joining ? 'Joining the voice room' : 'Join the class voice call'}
                                description={
                                    liveClass.description ??
                                    'A group voice room for this class. You can join without a camera.'
                                }
                                actions={<Badge tone={joining ? 'warn' : 'neutral'}>{joining ? 'Connecting' : 'Voice only'}</Badge>}
                            />
                            <CardBody>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <ul className="space-y-2 text-sm text-zinc-600">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden="true" />
                                            Everyone in the class can join the same room.
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden="true" />
                                            Your microphone stays off until you join and allow access.
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden="true" />
                                            {role === 'host'
                                                ? 'As the instructor you join as the room host.'
                                                : 'Join with your microphone; you can mute yourself at any time.'}
                                        </li>
                                    </ul>

                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => void joinCall()}
                                        disabled={!configured || joining}
                                    >
                                        {joining ? 'Joining…' : status === 'disconnected' ? 'Rejoin call' : 'Join voice call'}
                                    </button>
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </main>
            </div>
        </>
    );
}

function ParticipantTile({ participant }: { participant: ParticipantView }) {
    const initials = participant.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return (
        <div
            className={cn(
                'relative flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border bg-white p-4 text-center transition',
                participant.isSpeaking ? 'border-teal-400 ring-2 ring-teal-100' : 'border-zinc-200',
            )}
        >
            <span
                className={cn(
                    'avatar h-14 w-14 text-base',
                    participant.isSpeaking ? 'bg-teal-600 text-white' : 'bg-zinc-100 text-zinc-600',
                )}
                aria-hidden="true"
            >
                {initials || '?'}
            </span>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{participant.name}</p>
                <p className="meta">
                    {participant.isLocal ? 'You' : participant.role === 'host' ? 'Host' : 'Student'}
                </p>
            </div>
            {!participant.microphoneEnabled ? (
                <span className="absolute top-2 right-2 rounded-full bg-zinc-100 p-1 text-zinc-500" title="Muted">
                    <MicrophoneOffIcon />
                </span>
            ) : null}
            {participant.role === 'host' ? (
                <span className="absolute top-2 left-2">
                    <Badge tone="accent">Host</Badge>
                </span>
            ) : null}
        </div>
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

function metadataRole(metadata: string | undefined): CallRole | null {
    if (!metadata) {
        return null;
    }

    try {
        const parsed = JSON.parse(metadata) as { role?: string };

        if (parsed.role === 'host') {
            return 'host';
        }

        if (parsed.role === 'participant') {
            return 'participant';
        }
    } catch {
        return null;
    }

    return null;
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function requestToken(url: string): Promise<TokenPayload> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({}),
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
        const firstValidationError = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;

        return firstValidationError ?? body.message ?? `Could not join the call (${response.status}).`;
    } catch {
        return `Could not join the call (${response.status}).`;
    }
}

function MicrophoneIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5v3m-3 0h6" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2.25a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0v-6a3 3 0 0 1 3-3Z"
            />
        </svg>
    );
}

function MicrophoneOffIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 10.5v2.25a6 6 0 0 1-.5 2.4M15 5.25v-3A3 3 0 0 0 9 2.4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12v-.75M12 18.75a6 6 0 0 0 5.3-3.2M12 18.75v3m-3 0h6" />
        </svg>
    );
}
