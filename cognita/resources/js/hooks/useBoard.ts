import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ERASER_WIDTHS,
    INK_COLORS,
    INK_WIDTHS,
    LASER_TTL_MS,
    SURFACE_LABEL,
    ZOOM,
    nextStrokeId,
    pagesForSurface,
    sortStrokes,
} from '@/lib/board';
import { ApiError, postForm, postJson } from '@/lib/http';
import { StrokeLedger } from '@/lib/stroke-ledger';
import { userIdFromIdentity, type BoardMessage, type FrameSender } from '@/realtime';
import type { BoardDocumentSummary, BoardState, BoardStroke, BoardSurface, BoardTool } from '@/types';
import { useBoardSync } from './useBoardSync';

export interface UseBoardOptions {
    initial: BoardState;
    /** The instructor owns the surface, the page and the permission. */
    canManage: boolean;
    viewerId: number;
    saveUrl: string;
    uploadUrl: string;
    identity: string | null;
    send: (message: BoardMessage, kind?: 'reliable' | 'lossy') => void;
    onNotice: (message: string) => void;
    onUploaded?: (name: string) => void;
}

export interface BoardApi {
    board: BoardState;
    canDraw: boolean;
    canUndo: boolean;
    canRedo: boolean;
    uploading: boolean;
    tool: BoardTool;
    color: string;
    width: number;
    eraserWidth: number;
    zoom: number;
    setTool: (tool: BoardTool) => void;
    setColor: (color: string) => void;
    setWidth: (width: number) => void;
    setEraserWidth: (width: number) => void;
    setZoom: (zoom: number) => void;
    addStroke: (stroke: BoardStroke) => void;
    undo: () => void;
    redo: () => void;
    clearPage: () => void;
    flipPage: (page: number) => void;
    changeSurface: (surface: BoardSurface) => void;
    toggleStudents: () => void;
    setPageCount: (pages: number) => void;
    uploadPdf: (file: File) => Promise<void>;
    presentPdf: (document: BoardDocumentSummary) => Promise<void>;
    /** A frame from anyone else in the room. */
    applyRemote: (message: BoardMessage, sender: FrameSender) => void;
    /** The host changed who may draw: apply it and tell the room. */
    shareDrawers: (ids: number[]) => void;
    /** A board snapshot from the server: grant, heartbeat or restart. */
    adopt: (state: BoardState) => void;
    /** The room ended: drop the ink without touching the saved surface. */
    reset: () => void;
    newStrokeId: typeof nextStrokeId;
}

/**
 * The shared board, as state plus the handful of things you can do to it.
 *
 * Four rules are enforced here and nowhere else:
 *
 *   1. a student may only draw while the host has opened the pen *and* selected
 *      them — locally and for every remote frame that arrives,
 *   2. undo is personal: you may only remove a stroke you drew,
 *   3. ink is never saved. Strokes reach the server only as realtime frames, and
 *      the only thing a PATCH carries is the board's settings,
 *   4. ink belongs to a room, so a board snapshot from a different session
 *      replaces the canvas instead of merging with it.
 */
export function useBoard(options: UseBoardOptions): BoardApi {
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const [board, setBoard] = useState<BoardState>(options.initial);
    const [uploading, setUploading] = useState(false);
    const [tool, setTool] = useState<BoardTool>('pen');
    const [color, setColor] = useState(INK_COLORS[0]);
    const [width, setWidth] = useState(INK_WIDTHS[1]);
    const [eraserWidth, setEraserWidth] = useState(ERASER_WIDTHS[1]);
    const [zoom, setZoom] = useState(1);

    const boardRef = useRef(options.initial);
    const ledger = useRef(new StrokeLedger());
    /** Each sheet remembers its own page, so a trip to the canvas is harmless. */
    const pageMemory = useRef({
        canvas: options.initial.surface === 'canvas' ? options.initial.page : 1,
        pdf: options.initial.pdfPage ?? (options.initial.surface === 'pdf' ? options.initial.page : 1),
    });
    const redoStack = useRef<BoardStroke[]>([]);

    // A save answer can carry a newer room (a host drawing opens one), so it is
    // adopted exactly like a heartbeat snapshot.
    const adoptRef = useRef<(next: BoardState) => void>(() => undefined);
    const sync = useBoardSync(options.saveUrl, options.onNotice, (next) => adoptRef.current(next));

    const commit = useCallback((next: BoardState) => {
        boardRef.current = next;
        setBoard(next);
    }, []);

    const canDraw =
        options.canManage ||
        (board.studentsCanAnnotate && board.allowedDrawerIds.includes(options.viewerId));

    const broadcastState = useCallback((next: BoardState) => {
        optionsRef.current.send({ type: 'state', board: next });
    }, []);

    // -- local edits -------------------------------------------------------

    const addStroke = useCallback(
        (stroke: BoardStroke) => {
            if (!canDraw) {
                return;
            }

            const current = boardRef.current;
            const owned: BoardStroke = { ...stroke, by: stroke.by ?? optionsRef.current.identity ?? undefined };

            if (owned.tool !== 'laser') {
                redoStack.current = [];
                ledger.current.remember(owned.id, owned.by ?? null);
            }

            const strokes = sortStrokes([...current.strokes, owned]);
            commit({ ...current, strokes });
            optionsRef.current.send({ type: 'stroke', stroke: owned });
        },
        [canDraw, commit],
    );

    const undo = useCallback(() => {
        const current = boardRef.current;
        const id = ledger.current.latestOn(current.strokes);

        if (id === null) {
            return;
        }

        const removed = current.strokes.find((stroke) => stroke.id === id) ?? null;

        ledger.current.forget(id);

        if (removed !== null) {
            redoStack.current = [...redoStack.current.slice(-39), removed];
        }

        const strokes = current.strokes.filter((stroke) => stroke.id !== id);
        commit({ ...current, strokes });
        optionsRef.current.send({ type: 'undo', id });
    }, [commit]);

    const redo = useCallback(() => {
        const stroke = redoStack.current.pop();

        if (stroke === undefined) {
            return;
        }

        const current = boardRef.current;

        if (current.strokes.some((item) => item.id === stroke.id)) {
            return;
        }

        const restored: BoardStroke = { ...stroke, by: stroke.by ?? optionsRef.current.identity ?? undefined };

        ledger.current.remember(restored.id, restored.by ?? null);
        commit({ ...current, strokes: sortStrokes([...current.strokes, restored]) });
        optionsRef.current.send({ type: 'stroke', stroke: restored });
    }, [commit]);

    const clearPage = useCallback(() => {
        if (!optionsRef.current.canManage) {
            return;
        }

        const current = boardRef.current;
        const strokes = current.strokes.filter(
            (stroke) => stroke.surface !== current.surface || stroke.page !== current.page,
        );

        redoStack.current = [];
        commit({ ...current, strokes });
        optionsRef.current.send({ type: 'clear', surface: current.surface, page: current.page });
    }, [commit]);

    const flipPage = useCallback(
        (page: number) => {
            if (!optionsRef.current.canManage) {
                return;
            }

            const current = boardRef.current;
            const next = Math.max(1, Math.min(current.pages, page));

            if (next === current.page) {
                return;
            }

            pageMemory.current[current.surface] = next;

            const nextState: BoardState = {
                ...current,
                page: next,
                pdfPage: current.surface === 'pdf' ? next : current.pdfPage,
            };

            commit(nextState);
            optionsRef.current.send({ type: 'page', page: next });
            sync.save({ page: next }, { immediate: true });
        },
        [commit, sync],
    );

    const changeSurface = useCallback(
        (surface: BoardSurface) => {
            if (!optionsRef.current.canManage) {
                return;
            }

            const current = boardRef.current;

            if (surface === current.surface) {
                return;
            }

            const pages = pagesForSurface(surface, current.document?.pages ?? 1);

            pageMemory.current[current.surface] = current.page;

            const page =
                surface === 'pdf'
                    ? Math.max(1, Math.min(pages, pageMemory.current.pdf))
                    : 1;

            pageMemory.current[surface] = page;

            const next: BoardState = {
                ...current,
                surface,
                title: SURFACE_LABEL[surface],
                pages,
                page,
                pdfPage: surface === 'pdf' ? page : pageMemory.current.pdf,
            };

            // Zoom, tool and ink stay exactly where the instructor left them.
            commit(next);
            broadcastState(next);
            sync.save({ surface, page }, { immediate: true });
        },
        [broadcastState, commit, sync],
    );

    const toggleStudents = useCallback(() => {
        if (!optionsRef.current.canManage) {
            return;
        }

        const current = boardRef.current;
        const next = { ...current, studentsCanAnnotate: !current.studentsCanAnnotate };

        commit(next);
        broadcastState(next);
        sync.save({ students_can_annotate: next.studentsCanAnnotate }, { immediate: true });
    }, [broadcastState, commit, sync]);

    /** PDF.js counts the pages once the document is open; the class keeps them. */
    const setPageCount = useCallback(
        (pages: number) => {
            const current = boardRef.current;

            if (current.surface !== 'pdf' || pages < 1 || current.pages === pages) {
                return;
            }

            const document = current.document === null ? null : { ...current.document, pages };
            const next: BoardState = {
                ...current,
                pages,
                document,
                documents: current.documents.map((item) =>
                    item.id === document?.id ? { ...item, pages } : item,
                ),
            };

            commit(next);

            if (optionsRef.current.canManage) {
                broadcastState(next);
                sync.save({ pages }, { immediate: true });
            }
        },
        [broadcastState, commit, sync],
    );

    const setZoomLevel = useCallback((next: number) => {
        const clamped = Math.max(ZOOM.min, Math.min(ZOOM.max, next));

        setZoom(clamped);
        optionsRef.current.send({ type: 'zoom', zoom: clamped }, 'lossy');
    }, []);

    // Laser trails are pointers, not ink: each browser drops its own copies
    // once they have faded, without telling the rest of the room.
    useEffect(() => {
        const lasers = board.strokes.filter((stroke) => stroke.tool === 'laser');

        if (lasers.length === 0) {
            return;
        }

        const due = Math.min(...lasers.map((stroke) => (stroke.at ?? 0) + LASER_TTL_MS));
        const timer = window.setTimeout(
            () => {
                const current = boardRef.current;
                const stamp = Date.now();
                const strokes = current.strokes.filter(
                    (stroke) => stroke.tool !== 'laser' || stamp - (stroke.at ?? 0) < LASER_TTL_MS,
                );

                if (strokes.length !== current.strokes.length) {
                    commit({ ...current, strokes });
                }
            },
            Math.max(80, due - Date.now() + 80),
        );

        return () => window.clearTimeout(timer);
    }, [board.strokes, commit]);

    // -- documents ---------------------------------------------------------

    const adoptServerState = useCallback(
        (next: BoardState) => {
            pageMemory.current = {
                canvas: next.surface === 'canvas' ? next.page : 1,
                pdf: next.pdfPage ?? next.page,
            };
            redoStack.current = [];
            commit(next);
            broadcastState(next);
        },
        [broadcastState, commit],
    );

    const uploadPdf = useCallback(
        async (file: File): Promise<void> => {
            if (!optionsRef.current.canManage) {
                return;
            }

            setUploading(true);

            try {
                const form = new FormData();
                form.append('document', file);

                adoptServerState(await postForm<BoardState>(optionsRef.current.uploadUrl, form));
                optionsRef.current.onUploaded?.(file.name);
            } catch (error) {
                optionsRef.current.onNotice(
                    error instanceof ApiError ? error.message : 'That file could not be uploaded. PDFs up to 25 MB only.',
                );
            } finally {
                setUploading(false);
            }
        },
        [adoptServerState],
    );

    const presentPdf = useCallback(
        async (document: BoardDocumentSummary): Promise<void> => {
            if (!optionsRef.current.canManage) {
                return;
            }

            setUploading(true);

            try {
                adoptServerState(await postJson<BoardState>(document.selectUrl));
                optionsRef.current.onUploaded?.(document.name);
            } catch (error) {
                optionsRef.current.onNotice(
                    error instanceof ApiError ? error.message : 'That stored PDF could not be opened.',
                );
            } finally {
                setUploading(false);
            }
        },
        [adoptServerState],
    );

    // -- inbound -----------------------------------------------------------

    const applyRemote = useCallback(
        (message: BoardMessage, sender: FrameSender) => {
            const current = boardRef.current;

            // Anyone may ask to be brought up to date; the host is the one who
            // answers, with the board exactly as it stands in their browser.
            if (message.type === 'ask') {
                if (optionsRef.current.canManage) {
                    broadcastState(current);
                }

                return;
            }

            if (sender.role !== 'host' && !mayActAsParticipant(message, current, sender)) {
                return;
            }

            switch (message.type) {
                case 'state':
                    // The host is the authority on the surface, the page and a
                    // clear; take its board as it stands.
                    for (const stroke of message.board.strokes) {
                        ledger.current.attribute(stroke.id, stroke.by ?? null);
                    }

                    pageMemory.current.canvas =
                        message.board.surface === 'canvas' ? message.board.page : 1;
                    pageMemory.current.pdf = message.board.pdfPage ?? message.board.page;
                    redoStack.current = [];
                    commit(message.board);
                    return;

                case 'stroke': {
                    if (current.strokes.some((stroke) => stroke.id === message.stroke.id)) {
                        return;
                    }

                    const incoming: BoardStroke = {
                        ...message.stroke,
                        by: sender.identity ?? message.stroke.by ?? undefined,
                    };

                    ledger.current.attribute(incoming.id, incoming.by ?? null);
                    commit({ ...current, strokes: sortStrokes([...current.strokes, incoming]) });
                    return;
                }

                case 'undo': {
                    // Personal undo: your own stroke, or anything as the host.
                    const owner = ledger.current.ownerOf(message.id);

                    if (sender.role !== 'host' && (owner === null || owner !== sender.identity)) {
                        return;
                    }

                    ledger.current.forget(message.id);
                    commit({ ...current, strokes: current.strokes.filter((stroke) => stroke.id !== message.id) });
                    return;
                }

                case 'page':
                    pageMemory.current[current.surface] = message.page;
                    commit({
                        ...current,
                        page: message.page,
                        pdfPage: current.surface === 'pdf' ? message.page : current.pdfPage,
                    });
                    return;

                case 'clear':
                    commit({
                        ...current,
                        strokes: current.strokes.filter(
                            (stroke) => stroke.surface !== message.surface || stroke.page !== message.page,
                        ),
                    });
                    return;

                default:
                    // Zoom is a personal view setting, not a shared one.
                    return;
            }
        },
        [broadcastState, commit],
    );

    /** Drawer permissions live on the server; this keeps the room in step. */
    const shareDrawers = useCallback(
        (ids: number[]) => {
            const current = boardRef.current;
            const next: BoardState = {
                ...current,
                allowedDrawerIds: [...new Set(ids)].sort((left, right) => left - right),
            };

            commit(next);
            broadcastState(next);
        },
        [broadcastState, commit],
    );

    /**
     * A snapshot from the server: the room token, the surface, the page.
     *
     * It never carries ink, so the local canvas is the truth within a room and a
     * new room token is what clears it.
     */
    const adopt = useCallback(
        (next: BoardState) => {
            const current = boardRef.current;

            if (next.session !== current.session) {
                ledger.current.reset();
                redoStack.current = [];
                sync.drop();
                pageMemory.current = {
                    canvas: 1,
                    pdf: next.pdfPage ?? pageMemory.current.pdf,
                };
                commit(next);

                return;
            }

            pageMemory.current[next.surface] = next.page;
            pageMemory.current.pdf = next.pdfPage ?? pageMemory.current.pdf;
            commit({ ...next, strokes: current.strokes });
        },
        [commit, sync],
    );

    adoptRef.current = adopt;

    const reset = useCallback(() => {
        ledger.current.reset();
        redoStack.current = [];
        sync.drop();
        commit({ ...boardRef.current, strokes: [], session: null });
    }, [commit, sync]);

    return {
        board,
        canDraw,
        canUndo: ledger.current.hasAnythingOn(board.strokes),
        canRedo: redoStack.current.length > 0,
        uploading,
        tool,
        color,
        width,
        eraserWidth,
        zoom,
        setTool,
        setColor,
        setWidth,
        setEraserWidth,
        setZoom: setZoomLevel,
        addStroke,
        undo,
        redo,
        clearPage,
        flipPage,
        changeSurface,
        toggleStudents,
        setPageCount,
        uploadPdf,
        presentPdf,
        applyRemote,
        shareDrawers,
        adopt,
        reset,
        newStrokeId: nextStrokeId,
    };
}

/** A student's frame is only accepted while the pen is open to them. */
function mayActAsParticipant(message: BoardMessage, board: BoardState, sender: FrameSender): boolean {
    if (message.type !== 'stroke' && message.type !== 'undo') {
        return false;
    }

    if (!board.studentsCanAnnotate) {
        return false;
    }

    const senderId = userIdFromIdentity(sender.identity);

    return senderId !== null && board.allowedDrawerIds.includes(senderId);
}
