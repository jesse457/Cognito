import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endClass as endClassRequest, leaveRoom, requestDoctor, restartRoom, touchRoom, type DoctorReport } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { downloadRecording, recordingSupported, type RecordingResult } from '@/lib/recording';
import { playCue } from '@/lib/sound';
import {
    createCallTransport,
    joinError,
    type BoardMessage,
    type CallMessage,
    type CallParticipant,
    type CallRole,
    type CallTransport,
    type ConnectionStatus,
    type FrameSender,
    type JoinPhase,
    type PresenceFrame,
    type RealtimeConfig,
} from '@/realtime';
import type { BoardState } from '@/types';
import { useAttendance } from './useAttendance';

/** The room is kept warm by this heartbeat until the instructor ends the class. */
const HEARTBEAT_MS = 20_000;
const MEDIA_POLL_MS = 4_000;

export interface UseCallOptions {
    realtime: RealtimeConfig;
    role: CallRole;
    /** Per-tab suffix, so two tabs are two participants. */
    tabSession: string;
    secureContext: boolean;
    fallbackName: string;
    /** The room the page was rendered with, when one was already live. */
    initialSession: string | null;
    onBoardFrame: (message: BoardMessage, sender: FrameSender) => void;
    onPresenceFrame: (frame: PresenceFrame) => void;
    onComment: (message: CallMessage, sender: FrameSender) => void;
    onBoardState: (board: BoardState) => void;
}

export interface CallSenders {
    board: (message: BoardMessage, kind?: 'reliable' | 'lossy') => void;
    presence: (frame: PresenceFrame) => void;
    comment: (message: CallMessage) => void;
}

export interface CallApi {
    status: ConnectionStatus;
    inCall: boolean;
    joining: boolean;
    reconnecting: boolean;
    phase: JoinPhase | null;
    error: string | null;
    notice: string | null;
    participants: CallParticipant[];
    micEnabled: boolean;
    screenShareEnabled: boolean;
    audioBlocked: boolean;
    /** A local, on-device recording is running. */
    recording: boolean;
    recordingSeconds: number;
    /** The file from the last finished recording, once it has been saved. */
    lastRecording: RecordingResult | null;
    /** Whether this user and this browser may record. */
    canRecord: boolean;
    startRecording: (title: string) => Promise<void>;
    stopRecording: () => Promise<void>;
    mediaPath: string | null;
    identity: string | null;
    name: string;
    /** The live room, or null when nobody has opened one. */
    session: string | null;
    doctor: DoctorReport | null;
    doctorBusy: boolean;
    /** Which adapter actually runs, and whether it is a fallback. */
    driver: string;
    previewOnly: boolean;
    send: CallSenders;
    join: () => Promise<void>;
    leave: () => Promise<void>;
    toggleMicrophone: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;
    /** Report the drawn size of a remote share so only that much is downloaded. */
    reportScreenShareSize: (width: number, height: number) => void;
    enableAudio: () => Promise<void>;
    runDoctor: () => Promise<void>;
    startFreshRoom: () => Promise<void>;
    /** Instructor only: close the class session for everyone. */
    endClass: () => Promise<void>;
}

/**
 * The call, from the page's point of view.
 *
 * It owns exactly three things: the connection (delegated to whichever transport
 * the server named), the room heartbeat that keeps drawings alive, and the
 * handful of UI states the page needs to show. Everything about boards lives in
 * useBoard and everything about cursors in usePresence.
 */
export function useCall(options: UseCallOptions): CallApi {
    const callbacks = useRef(options);
    callbacks.current = options;

    const transport = useTransport(options);
    const attendance = useAttendance();

    const [status, setStatus] = useState<ConnectionStatus>('idle');
    const [phase, setPhase] = useState<JoinPhase | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [participants, setParticipants] = useState<CallParticipant[]>([]);
    const [micEnabled, setMicEnabled] = useState(false);
    const [screenShareEnabled, setScreenShareEnabled] = useState(false);
    const [audioBlocked, setAudioBlocked] = useState(false);
    const [mediaPath, setMediaPath] = useState<string | null>(null);
    const [identity, setIdentity] = useState<string | null>(null);
    const [name, setName] = useState(options.fallbackName);
    const [session, setSession] = useState<string | null>(options.initialSession);
    const [doctor, setDoctor] = useState<DoctorReport | null>(null);
    const [doctorBusy, setDoctorBusy] = useState(false);
    const [recording, setRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [lastRecording, setLastRecording] = useState<RecordingResult | null>(null);

    // A recording is downloaded once, whichever path stops it: the Stop button,
    // End class, a disconnected room, or the page being left.
    const savedRecording = useRef<RecordingResult | null>(null);
    const saveRecording = useCallback((result: RecordingResult | null): void => {
        if (result === null || savedRecording.current === result) {
            return;
        }

        savedRecording.current = result;
        downloadRecording(result);
        setLastRecording(result);
    }, []);

    const heartbeat = useRef<number | null>(null);
    // A double click must not race two joins with the same identity.
    const joining = useRef(false);
    // The room heartbeat needs the last token to tell an ended class from one
    // that was never opened, without rebuilding the interval on every render.
    const sessionRef = useRef<string | null>(options.initialSession);
    const inCall = status === 'connected' || status === 'reconnecting';

    const stopHeartbeat = useCallback(() => {
        if (heartbeat.current !== null) {
            window.clearInterval(heartbeat.current);
            heartbeat.current = null;
        }
    }, []);

    const runDoctor = useCallback(async (): Promise<void> => {
        setDoctorBusy(true);
        setDoctor(await requestDoctor(options.realtime.doctorUrl));
        setDoctorBusy(false);
    }, [options.realtime.doctorUrl]);

    /** Join or keep the room warm, and pick up ink drawn while we were away. */
    const touchRoomNow = useCallback(async (): Promise<void> => {
        try {
            const room = await touchRoom(options.realtime.touchUrl);
            const previous = sessionRef.current;

            sessionRef.current = room.session;
            setSession(room.session);

            if (room.attendance !== null) {
                attendance.start(room.attendance);
            }

            if (room.board !== null) {
                callbacks.current.onBoardState(room.board);
            }

            // The only way a live session disappears is the instructor ending
            // the class. Drop this browser out instead of leaving it in a room
            // whose board and attendance have already closed.
            if (previous !== null && room.session === null) {
                stopHeartbeat();
                attendance.stop();
                setStatus('idle');
                setPhase(null);
                setParticipants([]);
                setMicEnabled(false);
                setScreenShareEnabled(false);
                setAudioBlocked(false);
                setMediaPath(null);
                setError(null);
                setNotice('The instructor ended the class. This call is closed.');
                await transport.leave();
            }
        } catch (caught) {
            if (caught instanceof ApiError && caught.status === 409) {
                stopHeartbeat();
                attendance.stop();
                setStatus('idle');
                setPhase(null);
                setParticipants([]);
                setMicEnabled(false);
                setScreenShareEnabled(false);
                setAudioBlocked(false);
                setMediaPath(null);
                setError(caught.message);
                setNotice('This account joined the call in another browser. This tab has been disconnected.');
                await transport.leave();
            }

            /* any other missed heartbeat is retried; the meeting is not time-limited */
        }
    }, [attendance, options.realtime.touchUrl, stopHeartbeat, transport]);

    const startHeartbeat = useCallback(() => {
        stopHeartbeat();
        heartbeat.current = window.setInterval(() => void touchRoomNow(), HEARTBEAT_MS);
    }, [stopHeartbeat, touchRoomNow]);

    // -- transport events --------------------------------------------------

    useEffect(() => {
        return transport.subscribe((event) => {
            switch (event.type) {                case 'status':
                    setStatus(event.status);
                    break;
                case 'phase':
                    setPhase(event.phase);
                    break;
                case 'notice':
                    setNotice(event.message);
                    break;
                case 'error':
                    setError(event.message);
                    break;
                case 'ended':
                    sessionRef.current = null;
                    setSession(null);
                    setStatus('disconnected');
                    setError(event.reason);
                    stopHeartbeat();
                    attendance.stop();
                    void transport.stopRecording().then(saveRecording).catch(() => {});
                    playCue('leave');
                    break;
                case 'participants':
                    setParticipants(event.participants);
                    break;
                case 'microphone':
                    setMicEnabled(event.enabled);
                    break;
                case 'screenShare':
                    setScreenShareEnabled(event.enabled);
                    break;
                case 'audio':
                    setAudioBlocked(event.blocked);
                    break;
                case 'recording':
                    setRecording(event.state === 'started');

                    if (event.state === 'stopped') {
                        setRecordingSeconds(0);
                    }

                    break;
                case 'board':
                    callbacks.current.onBoardFrame(event.message, event.sender);
                    break;
                case 'presence':
                    callbacks.current.onPresenceFrame(event.frame);
                    break;
                case 'comment':
                    callbacks.current.onComment(event.message, event.sender);
                    break;
            }
        });
    }, [transport, stopHeartbeat, attendance, saveRecording]);

    // The REC chip and the Stop button both read one clock.
    useEffect(() => {
        if (!recording) {
            setRecordingSeconds(0);

            return;
        }

        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1_000));
        }, 1_000);

        return () => window.clearInterval(timer);
    }, [recording]);

    // Show the network path the browser actually chose, while it is connected.
    useEffect(() => {
        if (!inCall) {
            setMediaPath(null);

            return;
        }

        let cancelled = false;
        const sample = async (): Promise<void> => {
            const path = await transport.mediaPath();

            if (!cancelled) {
                setMediaPath(path);
            }
        };

        void sample();
        const timer = window.setInterval(() => void sample(), MEDIA_POLL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [inCall, transport]);

    // A closed tab must not leave a ghost participant behind, and a recording
    // in progress is finished and saved before the room is dropped.
    useEffect(() => {
        return () => {
            stopHeartbeat();
            void transport.stopRecording().then(saveRecording).catch(() => {});
            void transport.leave();
        };
    }, [transport, stopHeartbeat, saveRecording]);

    // -- actions -----------------------------------------------------------

    const join = useCallback(async (): Promise<void> => {
        if (joining.current || status === 'connecting' || inCall) {
            return;
        }

        joining.current = true;
        setStatus('connecting');
        setError(null);
        setNotice(null);
        setPhase('permission');

        try {
            const result = await transport.join();

            setIdentity(result.identity);
            setName(result.name);
            sessionRef.current = result.session;
            setSession(result.session);

            if (result.board !== null) {
                callbacks.current.onBoardState(result.board);
            }

            if (result.attendance !== null) {
                attendance.start(result.attendance);
            }

            setStatus('connected');
            setPhase(null);

            // A host's touch is what opens the room; a student joins the one
            // that is already there.
            await touchRoomNow();
            startHeartbeat();
            playCue('join');
        } catch (caught) {
            attendance.stop();
            stopHeartbeat();
            setStatus('error');
            setPhase(null);
            setError(joinError(caught, options.realtime.signalUrl));
            await transport.leave();
            playCue('error');
            void runDoctor();
        } finally {
            joining.current = false;
        }
    }, [attendance, inCall, options.realtime.signalUrl, runDoctor, startHeartbeat, status, stopHeartbeat, touchRoomNow, transport]);

    const leave = useCallback(async (): Promise<void> => {
        stopHeartbeat();
        attendance.stop();
        saveRecording(await transport.stopRecording().catch(() => null));
        leaveRoom(options.realtime.leaveUrl);

        await transport.leave();

        setStatus('idle');
        setPhase(null);
        sessionRef.current = null;
        setSession(null);
        setParticipants([]);
        setMicEnabled(false);
        setScreenShareEnabled(false);
        setAudioBlocked(false);
        setMediaPath(null);
        playCue('leave');
    }, [attendance, options.realtime.leaveUrl, saveRecording, stopHeartbeat, transport]);

    const toggleMicrophone = useCallback(async (): Promise<void> => {
        await transport.setMicrophone(!micEnabled);
        playCue('copy');
    }, [micEnabled, transport]);

    const toggleScreenShare = useCallback(async (): Promise<void> => {
        await transport.setScreenShare(!screenShareEnabled);
        playCue('copy');
    }, [screenShareEnabled, transport]);

    /**
     * The viewer tells us how big the share is drawn, and we pass that to the
     * call server. Stable identity so a re-render does not re-observe the
     * element, and free of state so it never causes one.
     */
    const reportScreenShareSize = useCallback(
        (width: number, height: number): void => {
            transport.requestScreenShareSize(width, height);
        },
        [transport],
    );

    const enableAudio = useCallback(async (): Promise<void> => {
        await transport.enableAudio();
    }, [transport]);

    /** Local to this device: nothing about a recording reaches the server. */
    const startRecording = useCallback(
        async (title: string): Promise<void> => {
            await transport.startRecording(title);
        },
        [transport],
    );

    const stopRecording = useCallback(async (): Promise<void> => {
        saveRecording(await transport.stopRecording().catch(() => null));
    }, [saveRecording, transport]);

    /** Clear the board into a new room without dropping anyone from the call. */
    const startFreshRoom = useCallback(async (): Promise<void> => {
        try {
            const room = await restartRoom(options.realtime.restartUrl);

            sessionRef.current = room.session;
            setSession(room.session);

            if (room.board !== null) {
                callbacks.current.onBoardState(room.board);
            }

            playCue('room');
        } catch {
            setNotice('The new room could not be started. Try again.');
        }
    }, [options.realtime.restartUrl]);

    /** The instructor's deliberate end. Nothing else closes the class session. */
    const endClass = useCallback(async (): Promise<void> => {
        saveRecording(await transport.stopRecording().catch(() => null));
        await endClassRequest(options.realtime.endUrl);

        stopHeartbeat();
        attendance.stop();
        sessionRef.current = null;
        setSession(null);
        setStatus('idle');
        setPhase(null);
        setParticipants([]);
        setMicEnabled(false);
        setScreenShareEnabled(false);
        setAudioBlocked(false);
        setMediaPath(null);
        setError(null);
        setNotice('The class ended for everyone.');

        await transport.leave();
    }, [attendance, options.realtime.endUrl, saveRecording, stopHeartbeat, transport]);

    const send = useMemo<CallSenders>(
        () => ({
            board: (message, kind) => transport.sendBoard(message, kind),
            presence: (frame) => transport.sendPresence(frame),
            comment: (message) => transport.sendComment(message),
        }),
        [transport],
    );

    const previewOnly = transport.driver !== options.realtime.driver;
    // Recording is the instructor's, on a real call server, in a browser that
    // can encode the mix. Everyone else never sees the control.
    const canRecord = options.role === 'host' && !previewOnly && recordingSupported();

    return {
        status,
        inCall,
        joining: status === 'connecting',
        reconnecting: status === 'reconnecting',
        phase,
        error,
        notice,
        participants,
        micEnabled,
        screenShareEnabled,
        audioBlocked,
        recording,
        recordingSeconds,
        lastRecording,
        canRecord,
        startRecording,
        stopRecording,
        mediaPath,
        identity,
        name,
        session,
        doctor,
        doctorBusy,
        driver: transport.driver,
        previewOnly,
        send,
        join,
        leave,
        toggleMicrophone,
        toggleScreenShare,
        reportScreenShareSize,
        enableAudio,
        runDoctor,
        startFreshRoom,
        endClass,
    };
}

/** One transport per mounted call page, built from the server's driver name. */
function useTransport(options: UseCallOptions): CallTransport {
    const ref = useRef<CallTransport | null>(null);

    if (ref.current === null) {
        ref.current = createCallTransport(options.realtime, {
            role: options.role,
            tabSession: options.tabSession,
            secureContext: options.secureContext,
            fallbackName: options.fallbackName,
        });
    }

    return ref.current;
}
