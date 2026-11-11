import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import BoardWorkspace from '@/components/call/BoardWorkspace';
import CallControls, { type Panel } from '@/components/call/CallControls';
import CallHeader from '@/components/call/CallHeader';
import CallLobby from '@/components/call/CallLobby';
import CallNotices, { type Notice } from '@/components/call/CallNotices';
import CallStage from '@/components/call/CallStage';
import CommentsPanel from '@/components/call/CommentsPanel';
import PeoplePanel from '@/components/call/PeoplePanel';
import PollsPanel from '@/components/call/PollsPanel';
import ConfirmDialog, { type ConfirmRequest } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useBoard, type BoardApi } from '@/hooks/useBoard';
import { useCall } from '@/hooks/useCall';
import { usePolls } from '@/hooks/usePolls';
import { usePresence, type PresenceApi } from '@/hooks/usePresence';
import { ApiError, patchJson, postJson } from '@/lib/http';
import type { RecordingResult } from '@/lib/recording';
import { routes } from '@/lib/routes';
import { muteSound, playCue, soundMuted } from '@/lib/sound';
import { tabSession } from '@/lib/tab-session';
import { copyText, formatBytes } from '@/lib/utils';
import {
    PRESENCE_STALE_MS,
    type BoardMessage,
    type CallMessage,
    type CallParticipant,
    type CallRole,
    type FrameSender,
    type PresenceFrame,
    type RealtimeConfig,
} from '@/realtime';
import type { BoardState, CommentEntry, RoomStudent } from '@/types';

interface RoomPageProps {
    classroom: { id: number; name: string; join_code: string; course: string | null; instructor: string | null };
    role: CallRole;
    viewerId: number;
    viewerName: string;
    students: RoomStudent[];
    board: BoardState;
    canManageBoard: boolean;
    room: string;
    realtime: RealtimeConfig;
    boardUrl: string;
    boardPdfUrl: string;
    backUrl: string;
    attendanceUrl: string | null;
}

const MAX_COMMENTS = 200;
const COPY_FEEDBACK_MS = 1_600;

/**
 * The live classroom.
 *
 * This file composes; it does not implement. Connections live in useCall, ink in
 * useBoard, cursors in usePresence, and the pieces of the screen live in
 * components/call. What is left here is the part that is genuinely about this
 * page: who is here, what just happened, and what to tell the person looking at
 * it.
 */
export default function LiveCallRoom({
    classroom,
    role,
    viewerId,
    viewerName,
    students: initialStudents,
    board: initialBoard,
    canManageBoard,
    realtime,
    boardUrl,
    boardPdfUrl,
    backUrl,
    attendanceUrl,
}: RoomPageProps) {
    const toast = useToast();

    const [soundOn, setSoundOn] = useState(() => !soundMuted());
    const [boardOpen, setBoardOpen] = useState(false);
    const [panel, setPanel] = useState<Panel>(null);
    const [comments, setComments] = useState<CommentEntry[]>([]);
    const [draft, setDraft] = useState('');
    const [students, setStudents] = useState<RoomStudent[]>(initialStudents);
    const [drawBusy, setDrawBusy] = useState<number | null>(null);
    const [kicking, setKicking] = useState<string | null>(null);
    const [permissionBusy, setPermissionBusy] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
    const [handRaised, setHandRaised] = useState(false);
    const [hidden, setHidden] = useState(() => (typeof document === 'undefined' ? false : document.hidden));
    const [copied, setCopied] = useState(false);
    const [fullscreenBoard, setFullscreenBoard] = useState(false);
    const [fullscreenControlsVisible, setFullscreenControlsVisible] = useState(true);

    // Bridges: the call hook needs the board and presence hooks, and both need
    // the call hook. A ref each breaks the circle without re-creating them.
    const boardRef = useRef<BoardApi | null>(null);
    const presenceRef = useRef<PresenceApi | null>(null);
    const panelRef = useRef<Panel>(null);
    panelRef.current = panel;

    // What the last render saw, so transitions can be announced exactly once.
    const seen = useRef({
        participants: new Map<string, string>(),
        hands: new Set<string>(),
        session: initialBoard.session,
        annotate: initialBoard.studentsCanAnnotate,
        share: null as string | null,
        error: null as string | null,
    });

    const talkSeen = useRef<{ identity: string | null; canTalk: boolean }>({ identity: null, canTalk: false });

    const secureContext = typeof window === 'undefined' ? true : window.isSecureContext;

    const onBoardFrame = useCallback((message: BoardMessage, sender: FrameSender) => {
        boardRef.current?.applyRemote(message, sender);
    }, []);

    const onPresenceFrame = useCallback((frame: PresenceFrame) => {
        presenceRef.current?.accept(frame);
    }, []);

    const onBoardState = useCallback((state: BoardState) => {
        boardRef.current?.adopt(state);
    }, []);

    const onComment = useCallback(
        (message: CallMessage, sender: FrameSender) => {
            setComments((current) =>
                current.some((comment) => comment.id === message.id)
                    ? current
                    : [
                          ...current,
                          {
                              id: message.id,
                              body: message.body,
                              at: message.at,
                              senderName: sender.name ?? 'Someone',
                              mine: false,
                          },
                      ].slice(-MAX_COMMENTS),
            );

            playCue('message');

            if (panelRef.current !== 'comments') {
                toast.push({
                    title: sender.name ?? 'Someone',
                    description: message.body,
                    tone: 'info',
                    duration: 5_000,
                });
            }
        },
        [toast],
    );

    const call = useCall({
        realtime,
        role,
        tabSession: tabSession(),
        secureContext,
        fallbackName: viewerName,
        initialSession: initialBoard.session,
        onBoardFrame,
        onPresenceFrame,
        onComment,
        onBoardState,
    });

    const presence = usePresence({
        active: call.inCall,
        identity: call.identity,
        name: call.name,
        role,
        send: call.send.presence,
    });
    presenceRef.current = presence;

    const polls = usePolls(classroom.id, call.inCall);

    const board = useBoard({
        initial: initialBoard,
        canManage: canManageBoard,
        viewerId,
        saveUrl: boardUrl,
        uploadUrl: boardPdfUrl,
        identity: call.identity,
        send: call.send.board,
        onNotice: (message) => toast.push({ title: 'The board was not saved', description: message, tone: 'error' }),
        onUploaded: (name) => {
            toast.push({ title: `${name} is on the board`, tone: 'success' });
            playCue('copy');
        },
    });
    boardRef.current = board;

    const state = board.board;
    const hands = useMemo(
        () =>
            new Set(
                presence.frames
                    .filter((frame) => frame.handRaised && presence.now - frame.ts < PRESENCE_STALE_MS)
                    .map((frame) => frame.identity),
            ),
        [presence.frames, presence.now],
    );

    const localParticipant = call.participants.find((participant) => participant.isLocal);
    const canTalk = role === 'host' || localParticipant?.canPublish === true;
    const canShareScreen = canTalk && !call.previewOnly;
    const canManageAudio = canManageBoard && !call.previewOnly;
    const sharing = call.participants.find((participant) => participant.screenShare !== null) ?? null;

    const announcedPoll = useRef<number | null>(null);

    useEffect(() => {
        const poll = polls.active;

        if (!call.inCall || poll === null) {
            announcedPoll.current = null;

            return;
        }

        if (announcedPoll.current === poll.id) {
            return;
        }

        announcedPoll.current = poll.id;

        if (panelRef.current === 'polls') {
            return;
        }

        playCue('message');
        toast.push({
            title: 'Live poll started',
            description: poll.question,
            tone: 'info',
            duration: 8_000,
            action: {
                label: role === 'host' ? 'Open' : 'Answer',
                onClick: () => setPanel('polls'),
            },
        });
    }, [call.inCall, polls.active, role, toast]);

    // -- presence ----------------------------------------------------------

    useEffect(() => {
        if (!call.inCall) {
            return;
        }

        presence.update({
            surface: state.surface,
            page: state.page,
            tool: board.tool,
            boardOpen,
            hidden,
            handRaised,
        });
    }, [call.inCall, presence.update, state.surface, state.page, board.tool, boardOpen, hidden, handRaised]);

    useEffect(() => {
        function onVisibility(): void {
            setHidden(document.hidden);
        }

        document.addEventListener('visibilitychange', onVisibility);

        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    // The host's canvas is the room's ink. When the room changes — opened, or
    // restarted with the sparkle — say so at once, so every browser blanks its
    // own canvas at the same moment instead of waiting for a heartbeat.
    const announcedRoom = useRef<string | null>(initialBoard.session);

    useEffect(() => {
        const token = call.session;

        if (!call.inCall || !canManageBoard || token === null || announcedRoom.current === token) {
            return;
        }

        announcedRoom.current = token;
        call.send.board({ type: 'state', board: board.board });
    }, [call.inCall, canManageBoard, call.session, call.send, board.board]);

    // Nobody stores the ink, so a late joiner has to ask for it. The host answers
    // with the room as it stands; a few tries covers a join that races the
    // host's own connection.
    const asked = useRef<string | null>(null);

    useEffect(() => {
        if (!call.inCall || canManageBoard || call.session === null) {
            return;
        }

        const key = `${call.session}:${call.identity ?? 'pending'}`;

        if (asked.current === key) {
            return;
        }

        asked.current = key;

        const timers = [0, 1_200, 3_500].map((delay) =>
            window.setTimeout(() => call.send.board({ type: 'ask' }), delay),
        );

        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [call.inCall, call.session, call.identity, call.send, canManageBoard]);

    // -- announcements -----------------------------------------------------

    // The room the page was rendered with can end, or be replaced by a fresh one.
    useEffect(() => {
        const before = seen.current.session;
        seen.current.session = call.session;

        if (before === call.session) {
            return;
        }

        if (call.session === null) {
            board.reset();

            // Our own leave already said its piece; this is for a room that ends
            // while we are still watching it.
            if (!call.inCall) {
                return;
            }

            playCue('room');
            toast.push({
                title: 'The room ended',
                description: 'Drawings live in the room only, so they are gone. The class PDFs are still here.',
                tone: 'warn',
                duration: 8_000,
            });

            return;
        }

        if (before !== null) {
            playCue('room');
            toast.push({ title: 'A new room started', description: 'The board is blank again for this lesson.', tone: 'info' });
        }
    }, [call.session, call.inCall, board, toast]);

    useEffect(() => {
        const before = seen.current.participants;
        const names = new Map(call.participants.map((participant) => [participant.identity, participant.name]));
        const joined = call.participants.filter((participant) => !participant.isLocal && !before.has(participant.identity));
        const left = [...before.entries()].filter(([identity]) => !names.has(identity));

        seen.current.participants = names;

        joined.forEach((participant) => {
            playCue('join');
            toast.push({ title: `${participant.name} joined`, tone: 'success' });
        });

        left.forEach(([, name]) => {
            playCue('leave');
            toast.push({ title: `${name} left`, tone: 'info' });
        });
    }, [call.participants, toast]);

    useEffect(() => {
        const before = seen.current.hands;
        seen.current.hands = hands;

        [...hands]
            .filter((identity) => !before.has(identity) && identity !== call.identity)
            .forEach((identity) => {
                const frame = presence.frames.find((item) => item.identity === identity);

                if (frame === undefined) {
                    return;
                }

                playCue('hand');
                toast.push({ title: `${frame.name} raised a hand`, tone: 'warn', duration: 6_000 });
            });
    }, [hands, presence.frames, call.identity, toast]);

    // The instructor opened or closed this student's microphone. The transport
    // has already applied the audio change; this is the human sentence for it.
    useEffect(() => {
        if (!call.inCall || role === 'host') {
            talkSeen.current = { identity: call.identity, canTalk };

            return;
        }

        const previous = talkSeen.current;
        talkSeen.current = { identity: call.identity, canTalk };

        if (previous.identity === null || previous.identity !== call.identity || previous.canTalk === canTalk) {
            return;
        }

        if (canTalk) {
            playCue('join');
            toast.push({
                title: 'The instructor let you talk',
                description: 'Your microphone is on. Mute it in the bar when you are done.',
                tone: 'success',
                duration: 6_000,
            });

            if (handRaised) {
                setHandRaised(false);
                presenceRef.current?.raiseHand(false);
            }

            return;
        }

        playCue('leave');
        toast.push({
            title: 'Your microphone was closed',
            description: 'Raise your hand when you want to speak again.',
            tone: 'info',
            duration: 6_000,
        });
    }, [call.inCall, call.identity, canTalk, handRaised, role, toast]);

    useEffect(() => {
        const identity = sharing?.identity ?? null;
        const before = seen.current.share;

        seen.current.share = identity;

        if (identity === null || identity === before || identity === call.identity || sharing === null) {
            return;
        }

        playCue('join');
        toast.push({
            title: `${sharing.name} is sharing a screen`,
            description: boardOpen ? 'Hide the board to watch it.' : 'The shared screen is on the main stage.',
            tone: 'info',
            duration: 7_000,
            action: boardOpen ? { label: 'Show screen', onClick: () => setBoardOpen(false) } : undefined,
        });
    }, [sharing, boardOpen, call.identity, toast]);

    useEffect(() => {
        const before = seen.current.annotate;
        seen.current.annotate = state.studentsCanAnnotate;

        if (before === state.studentsCanAnnotate || canManageBoard) {
            return;
        }

        if (state.studentsCanAnnotate) {
            if (board.canDraw) {
                playCue('pen');
            }

            toast.push({
                title: board.canDraw ? 'You can draw now' : 'Students can draw now',
                description: 'Pick a pen from the board toolbar.',
                tone: 'success',
                duration: 6_000,
            });

            return;
        }

        toast.push({ title: 'The pen is back with the instructor', tone: 'info' });
    }, [state.studentsCanAnnotate, canManageBoard, board.canDraw, toast]);

    useEffect(() => {
        if (call.error === null || call.error === seen.current.error) {
            return;
        }

        seen.current.error = call.error;
        playCue('error');
        toast.push({ title: 'Call problem', description: call.error, tone: 'error', duration: 9_000 });
    }, [call.error, toast]);

    useEffect(() => {
        if (call.audioBlocked) {
            playCue('error');
        }
    }, [call.audioBlocked]);

    // The hook saves the file the moment a recording stops; this is the human
    // sentence for it, with the name and size so it can be found again.
    const announcedRecording = useRef<RecordingResult | null>(null);

    useEffect(() => {
        const result = call.lastRecording;

        if (result === null || announcedRecording.current === result) {
            return;
        }

        announcedRecording.current = result;
        playCue('copy');
        toast.push({
            title: 'Recording saved to this device',
            description: `${result.fileName} · ${formatBytes(result.blob.size)}. Nothing was uploaded.`,
            tone: 'success',
            duration: 10_000,
        });
    }, [call.lastRecording, toast]);

    // Closing the tab throws away an unfinished recording, so say so first.
    useEffect(() => {
        if (!call.recording) {
            return;
        }

        const warn = (event: BeforeUnloadEvent): void => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', warn);

        return () => window.removeEventListener('beforeunload', warn);
    }, [call.recording]);

    // -- actions -----------------------------------------------------------

    // Publishing a presence frame is a side effect, so it must not live inside a
    // setState updater: React is free to run an updater more than once, and a
    // doubled frame is a doubled hand-raise that the next toggle then cancels.
    const toggleHand = useCallback(() => {
        const next = !handRaised;

        setHandRaised(next);
        presenceRef.current?.raiseHand(next);
    }, [handRaised]);

    const toggleScreenShare = useCallback(() => {
        if (!call.screenShareEnabled) {
            setBoardOpen(false);
            setFullscreenBoard(false);
            setFullscreenControlsVisible(true);
        }

        void call.toggleScreenShare();
    }, [call.screenShareEnabled, call.toggleScreenShare]);

    const toggleSound = useCallback(() => {
        setSoundOn((current) => !current);
    }, []);

    const handleFullscreenChange = useCallback((active: boolean): void => {
        setFullscreenBoard(active);

        if (active) {
            setFullscreenControlsVisible(true);
        }
    }, []);

    const toggleBoard = useCallback(() => {
        const next = !boardOpen;

        setBoardOpen(next);

        if (!next) {
            setFullscreenBoard(false);
            setFullscreenControlsVisible(true);
        }
    }, [boardOpen]);

    // One place writes the preference, so the choice survives a refresh.
    useEffect(() => {
        muteSound(!soundOn);
    }, [soundOn]);

    const toggleRecording = useCallback(async (): Promise<void> => {
        if (call.recording) {
            await call.stopRecording();

            return;
        }

        try {
            await call.startRecording(classroom.name);
            playCue('copy');
            toast.push({
                title: 'Recording to this device',
                description: 'Press Stop when the lesson is over. The file downloads; nothing is uploaded.',
                tone: 'info',
                duration: 7_000,
            });
        } catch (error) {
            toast.push({
                title: 'Recording could not start',
                description: error instanceof Error ? error.message : 'Please try again.',
                tone: 'error',
            });
        }
    }, [call.recording, call.startRecording, call.stopRecording, classroom.name, toast]);

    const copyKey = useCallback(async (): Promise<void> => {
        if (!(await copyText(classroom.join_code))) {
            toast.push({ title: 'Could not copy the key', description: classroom.join_code, tone: 'warn' });

            return;
        }

        setCopied(true);
        playCue('copy');
        toast.push({ title: 'Class key copied', description: classroom.join_code, tone: 'success' });
        window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    }, [classroom.join_code, toast]);

    const sendComment = useCallback(() => {
        const body = draft.trim();

        if (body === '' || !call.inCall) {
            return;
        }

        const message: CallMessage = {
            type: 'comment',
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at: Date.now(),
            body,
        };

        call.send.comment(message);
        setComments((current) =>
            [...current, { id: message.id, body, at: message.at, senderName: call.name, mine: true }].slice(-MAX_COMMENTS),
        );
        setDraft('');
    }, [draft, call.inCall, call.send, call.name]);

    const leave = useCallback(async (): Promise<void> => {
        await call.leave();
        setBoardOpen(false);
        setFullscreenBoard(false);
        setFullscreenControlsVisible(true);
        setPanel(null);
        setHandRaised(false);
        playCue('leave');
        toast.push({
            title: 'You left the call',
            description:
                role === 'host'
                    ? 'The class session stays open. Press End class when the lesson is over.'
                    : 'The class session stays open; rejoin with the same link when you are ready.',
            tone: 'info',
        });
    }, [call.leave, role, toast]);

    const endClass = useCallback((): void => {
        setConfirm({
            title: 'End the class for everyone?',
            description:
                'Every participant is disconnected, open attendance closes, and the next join starts a new class session with a blank board.',
            confirmLabel: 'End class',
            tone: 'danger',
            onConfirm: () => {
                setConfirm(null);

                void (async () => {
                    try {
                        await call.endClass();
                        setBoardOpen(false);
                        setFullscreenBoard(false);
                        setFullscreenControlsVisible(true);
                        setPanel(null);
                        setHandRaised(false);
                        playCue('leave');
                        toast.push({
                            title: 'Class ended',
                            description: 'Everyone was disconnected and attendance is closed.',
                            tone: 'success',
                        });
                    } catch (error) {
                        toast.push({
                            title: 'The class could not be ended',
                            description: error instanceof ApiError ? error.message : 'Please try again.',
                            tone: 'error',
                        });
                    }
                })();
            },
        });
    }, [call.endClass, toast]);

    const removeParticipant = useCallback(
        (participant: CallParticipant): void => {
            setConfirm({
                title: `Remove ${participant.name}?`,
                description: 'They drop out of this call immediately and can rejoin with the class key.',
                confirmLabel: 'Remove',
                tone: 'danger',
                onConfirm: () => {
                    setConfirm(null);
                    setKicking(participant.identity);

                    void (async () => {
                        try {
                            await postJson(routes.callParticipantRemove(classroom.id, participant.identity), {});
                            playCue('leave');
                            toast.push({ title: `${participant.name} was removed from the call`, tone: 'success' });
                        } catch (error) {
                            toast.push({
                                title: 'That did not work',
                                description: error instanceof ApiError ? error.message : 'Please try again.',
                                tone: 'error',
                            });
                        } finally {
                            setKicking(null);
                        }
                    })();
                },
            });
        },
        [classroom.id, toast],
    );

    const setTalkPermission = useCallback(
        (participant: CallParticipant, allowed: boolean): void => {
            setPermissionBusy(participant.identity);

            void (async () => {
                try {
                    await postJson(routes.callParticipantPermission(classroom.id, participant.identity), {
                        can_talk: allowed,
                    });

                    playCue(allowed ? 'join' : 'leave');
                    toast.push({
                        title: allowed
                            ? `${participant.name} can talk now`
                            : `${participant.name} was muted`,
                        description: allowed
                            ? 'Their microphone is open for this call only.'
                            : 'They can raise a hand to ask again.',
                        tone: 'info',
                    });
                } catch (error) {
                    toast.push({
                        title: 'That did not work',
                        description: error instanceof ApiError ? error.message : 'Please try again.',
                        tone: 'error',
                    });
                } finally {
                    setPermissionBusy(null);
                }
            })();
        },
        [classroom.id, toast],
    );

    const toggleStudentDrawing = useCallback(
        (student: RoomStudent): void => {
            setDrawBusy(student.id);

            void (async () => {
                try {
                    const result = await patchJson<{ can_draw: boolean }>(
                        routes.instructor.studentDrawing(classroom.id, student.id),
                        { can_draw: !student.can_draw },
                    );

                    const next = students.map((item) =>
                        item.id === student.id ? { ...item, can_draw: result.can_draw } : item,
                    );

                    setStudents(next);
                    board.shareDrawers(next.filter((item) => item.can_draw).map((item) => item.id));

                    if (result.can_draw) {
                        playCue('pen');
                    }

                    toast.push({
                        title: result.can_draw ? `${student.name} can draw now` : `${student.name} can no longer draw`,
                        tone: 'info',
                    });
                } catch (error) {
                    toast.push({
                        title: 'That did not work',
                        description: error instanceof ApiError ? error.message : 'Please try again.',
                        tone: 'error',
                    });
                } finally {
                    setDrawBusy(null);
                }
            })();
        },
        [classroom.id, students, board, toast],
    );

    // -- keyboard ----------------------------------------------------------

    useEffect(() => {
        function onKey(event: KeyboardEvent): void {
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const target = event.target as HTMLElement | null;

            if (target !== null && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }

            if (event.key === 'Escape') {
                setPanel(null);
                setConfirm(null);

                return;
            }

            if (!call.inCall) {
                return;
            }

            switch (event.key.toLowerCase()) {
                case 'm':
                    void call.toggleMicrophone();
                    break;
                case 'b':
                    setBoardOpen((current) => !current);
                    break;
                case 'h':
                    toggleHand();
                    break;
                case 'p':
                    setPanel((current) => (current === 'polls' ? null : 'polls'));
                    break;
                case 'r':
                    if (call.canRecord) {
                        void toggleRecording();
                    }
                    break;
                default:
                    break;
            }
        }

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [call.inCall, call.canRecord, call.toggleMicrophone, toggleHand, toggleRecording]);

    // -- notices -----------------------------------------------------------

    const notices: Notice[] = [];

    if (call.inCall) {
        if (call.previewOnly) {
            notices.push({
                id: 'preview',
                tone: 'info',
                title: `${call.driver} preview`,
                description: 'No call server is configured, so the board is shared with tabs on this device only.',
            });
        }

        if (call.recording) {
            notices.push({
                id: 'recording',
                tone: 'info',
                title: 'Recording on this device',
                description: 'Lesson audio and any shared screen are saved locally when you stop. Nothing is uploaded.',
            });
        }

        if (call.reconnecting) {
            notices.push({
                id: 'reconnecting',
                tone: 'warn',
                title: 'Reconnecting…',
                description: 'Your microphone and the board resume when the connection is back.',
            });
        }

        if (call.audioBlocked) {
            notices.push({
                id: 'audio',
                tone: 'warn',
                title: 'Sound is blocked',
                description: 'The browser held playback until you interact with the page.',
                action: { label: 'Enable sound', onClick: () => void call.enableAudio() },
            });
        }

        if (role === 'participant' && !canTalk) {
            notices.push({
                id: 'listen-only',
                tone: 'info',
                title: 'You are listening only',
                description: handRaised
                    ? 'Your hand is raised. The instructor can open your microphone.'
                    : 'Raise your hand to ask the instructor to let you talk.',
            });
        }

        if (!secureContext && realtime.secureUrl !== null) {
            notices.push({
                id: 'secure',
                tone: 'warn',
                title: 'This page is not on https',
                description: 'The browser will not open a microphone here.',
            });
        }

        if (call.notice !== null) {
            notices.push({ id: 'notice', tone: 'info', title: call.notice });
        }

        if (sharing !== null && boardOpen) {
            notices.push({
                id: 'screen-share',
                tone: 'info',
                title: `${sharing.name} is sharing a screen`,
                description: 'Hide the board to watch it.',
                action: { label: 'Hide board', onClick: () => setBoardOpen(false) },
            });
        }

        if (role === 'participant' && state.session === null) {
            notices.push({
                id: 'waiting',
                tone: 'info',
                title: 'Waiting for the instructor',
                description: 'The board opens when they start the room.',
            });
        }
    }

    const callControls = (
        <CallControls
            micEnabled={call.micEnabled}
            canTalk={canTalk}
            screenShareEnabled={call.screenShareEnabled}
            canShareScreen={canShareScreen}
            handRaised={handRaised}
            boardOpen={boardOpen}
            panel={panel}
            audioBlocked={call.audioBlocked}
            participantCount={call.participants.length}
            commentCount={comments.length}
            pollCount={polls.active === null ? 0 : 1}
            recording={call.recording}
            recordingSeconds={call.recordingSeconds}
            canRecord={call.canRecord}
            onToggleRecording={() => void toggleRecording()}
            onToggleMic={() => void call.toggleMicrophone()}
            onToggleScreenShare={toggleScreenShare}
            onToggleHand={toggleHand}
            onToggleBoard={toggleBoard}
            onHideControls={fullscreenBoard ? () => setFullscreenControlsVisible(false) : undefined}
            onPanel={setPanel}
            onEnableAudio={() => void call.enableAudio()}
            onLeave={() => void leave()}
            onEndClass={role === 'host' ? endClass : undefined}
        />
    );

    function renderSidePanel(): ReactNode {
        if (!call.inCall) {
            return null;
        }

        if (panel === 'people') {
            return (
                <PeoplePanel
                    open
                    participants={call.participants}
                    hands={hands}
                    students={students}
                    canManage={canManageBoard}
                    canManageAudio={canManageAudio}
                    studentsCanAnnotate={state.studentsCanAnnotate}
                    selectedDrawers={state.allowedDrawerIds.length}
                    boardSurface={state.surface}
                    drawBusy={drawBusy}
                    kicking={kicking}
                    permissionBusy={permissionBusy}
                    mediaPath={call.mediaPath}
                    onClose={() => setPanel(null)}
                    onToggleStudents={board.toggleStudents}
                    onToggleStudentDrawing={toggleStudentDrawing}
                    onSetTalkPermission={setTalkPermission}
                    onRemove={removeParticipant}
                />
            );
        }

        if (panel === 'comments') {
            return (
                <CommentsPanel
                    open
                    comments={comments}
                    draft={draft}
                    myName={call.name}
                    onDraft={setDraft}
                    onSend={sendComment}
                    onClose={() => setPanel(null)}
                />
            );
        }

        if (panel === 'polls') {
            return (
                <PollsPanel
                    open
                    role={role}
                    polls={polls.polls}
                    active={polls.active}
                    onClose={() => setPanel(null)}
                    onCreate={async (input) => {
                        await polls.create(input);
                    }}
                    onRespond={async (pollId, response) => {
                        await polls.respond(pollId, response);
                    }}
                    onClosePoll={async (pollId) => {
                        await polls.close(pollId);
                    }}
                    onRefresh={polls.refresh}
                />
            );
        }

        return null;
    }

    const sidePanel = renderSidePanel();

    const handsUp = [...hands].filter((identity) => identity !== call.identity).length;

    return (
        <>
            <Head title={`${classroom.name} · Live call`} />

            <div className="call-shell">
                <CallHeader
                    name={classroom.name}
                    course={classroom.course}
                    instructor={classroom.instructor}
                    joinCode={classroom.join_code}
                    backUrl={backUrl}
                    attendanceUrl={attendanceUrl}
                    inCall={call.inCall}
                    reconnecting={call.reconnecting}
                    participantCount={call.participants.length}
                    raisedHands={handsUp}
                    soundMuted={!soundOn}
                    copied={copied}
                    recording={call.recording}
                    recordingSeconds={call.recordingSeconds}
                    onToggleSound={toggleSound}
                    onCopyKey={() => void copyKey()}
                    onShowHands={() => setPanel('people')}
                />

                <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                    <main className="call-main">
                        {call.inCall ? (
                            <>
                                {boardOpen ? (
                                    <BoardWorkspace
                                        board={board}
                                        presence={presence.frames}
                                        now={presence.now}
                                        canManage={canManageBoard}
                                        live={call.session !== null}
                                        participants={call.participants}
                                        hands={hands}
                                        onCursor={(point) => presence.update({ cursor: point })}
                                        onNewRoom={() => void call.startFreshRoom()}
                                        onFullscreenChange={handleFullscreenChange}
                                        fullscreenControls={callControls}
                                        fullscreenPanel={sidePanel ?? undefined}
                                        showFullscreenControls={fullscreenControlsVisible}
                                        onShowFullscreenControls={() => setFullscreenControlsVisible(true)}
                                    />
                                ) : (
                                    <CallStage
                                        participants={call.participants}
                                        hands={hands}
                                        layout="grid"
                                        onScreenShareSize={call.reportScreenShareSize}
                                    />
                                )}

                                <CallNotices notices={notices} />

                                {fullscreenBoard ? null : callControls}
                            </>
                        ) : (
                            <CallLobby
                                classroom={classroom}
                                role={role}
                                driver={call.driver}
                                previewOnly={call.previewOnly}
                                secureContext={secureContext}
                                secureUrl={realtime.secureUrl}
                                joining={call.joining}
                                phase={call.phase}
                                error={call.error}
                                notice={call.notice}
                                doctor={call.doctor}
                                doctorBusy={call.doctorBusy}
                                onJoin={() => void call.join()}
                                onRunDoctor={() => void call.runDoctor()}
                            />
                        )}
                    </main>

                    {fullscreenBoard ? null : sidePanel}
                </div>
            </div>

            <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
        </>
    );
}
