import { useEffect, useRef, useState } from 'react';
import CursorLayer from '@/components/board/CursorLayer';
import { canvasPixelRatio, drawPaper, drawStroke, ratioForSurface } from '@/components/board/ink';
import { usePdfPage } from '@/components/board/usePdfPage';
import { LASER_COLOR, LASER_TTL_MS } from '@/lib/board';
import { cn } from '@/lib/utils';
import { PRESENCE_STALE_MS, type PresenceFrame } from '@/realtime';
import type { BoardStroke, BoardSurface, BoardTool } from '@/types';

interface BoardStageProps {
    surface: BoardSurface;
    documentUrl: string | null;
    page: number;
    strokes: BoardStroke[];
    canDraw: boolean;
    tool: BoardTool;
    color: string;
    width: number;
    eraserWidth: number;
    zoom: number;
    presence: PresenceFrame[];
    now: number;
    /** Fullscreen view: the sheet gets the whole screen and the padding goes. */
    immersive?: boolean;
    newStrokeId: () => number;
    onStroke: (stroke: BoardStroke) => void;
    onPageCount: (pages: number) => void;
    onCursor: (point: [number, number] | null) => void;
}

interface TextDraft {
    x: number;
    y: number;
    value: string;
}

const CURSOR_INTERVAL_MS = 40;

/**
 * The sheet everyone draws on.
 *
 * Two canvases: one paints the page (ruled paper, dot grid, or the PDF page),
 * the other holds the ink. Pointer events only ever touch the ink layer, which
 * is why erasing can use a composite operation instead of repainting the page.
 */
export default function BoardStage({
    surface,
    documentUrl,
    page,
    strokes,
    canDraw,
    tool,
    color,
    width,
    eraserWidth,
    zoom,
    presence,
    now,
    immersive = false,
    newStrokeId,
    onStroke,
    onPageCount,
    onCursor,
}: BoardStageProps) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const paperRef = useRef<HTMLCanvasElement | null>(null);
    const inkRef = useRef<HTMLCanvasElement | null>(null);
    const cursorRef = useRef<HTMLDivElement | null>(null);
    const spotlightRef = useRef<HTMLDivElement | null>(null);
    const draftRef = useRef<BoardStroke | null>(null);
    const lastCursor = useRef(0);

    const [box, setBox] = useState({ width: 0, height: 0 });
    const [version, setVersion] = useState(0);
    const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
    const [flipping, setFlipping] = useState(false);

    const isPdf = surface === 'pdf' && documentUrl !== null;
    const pdf = usePdfPage(isPdf ? documentUrl : null, onPageCount);
    const ratio = isPdf ? pdf.ratio ?? ratioForSurface('pdf') : ratioForSurface(surface);
    const zoomed = zoom > 1.001;
    const spotlightRadius = Math.max(110, Math.min(240, box.width * 0.2));

    // A spotlight is shared, so it follows the pointer of whoever selected it.
    const remoteSpotlight =
        presence.find(
            (frame) =>
                frame.tool === 'spotlight' &&
                frame.surface === surface &&
                frame.page === page &&
                frame.cursor !== null &&
                !frame.hidden &&
                now - frame.ts < PRESENCE_STALE_MS,
        ) ?? null;

    // Laser strokes fade in real time, so a fresh one keeps the ink repainting
    // until the trail expires.
    useEffect(() => {
        const fresh = strokes.some(
            (stroke) =>
                stroke.tool === 'laser' &&
                stroke.surface === surface &&
                stroke.page === page &&
                Date.now() - (stroke.at ?? 0) < LASER_TTL_MS,
        );

        if (!fresh) {
            return;
        }

        const timer = window.setInterval(() => setVersion((current) => current + 1), 120);

        return () => window.clearInterval(timer);
    }, [strokes, surface, page]);

    // Changing tools, sheets or pages puts the lights back on until the
    // pointer moves again.
    useEffect(() => {
        if (spotlightRef.current !== null) {
            spotlightRef.current.style.opacity = '0';
        }
    }, [tool, surface, page]);

    // --- Fit the sheet inside the stage without distorting the page --------
    useEffect(() => {
        const node = wrapRef.current;

        if (node === null) {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (entry === undefined) {
                return;
            }

            // A phone has no room to spare, and fullscreen has already given it
            // everything it has: keep the margin tiny so the sheet is as big as
            // the display allows.
            const pad = immersive ? 4 : entry.contentRect.width < 640 ? 6 : 14;
            const availableWidth = Math.max(160, entry.contentRect.width - pad * 2);
            const availableHeight = Math.max(200, entry.contentRect.height - pad * 2);

            let fitWidth = availableWidth;
            let fitHeight = fitWidth / ratio;

            if (fitHeight > availableHeight) {
                fitHeight = availableHeight;
                fitWidth = fitHeight * ratio;
            }

            setBox({ width: Math.round(fitWidth * zoom), height: Math.round(fitHeight * zoom) });
        });

        observer.observe(node);

        return () => observer.disconnect();
    }, [ratio, zoom, immersive]);

    // A page or surface change gets a short, quiet transition.
    useEffect(() => {
        setTextDraft(null);
        setFlipping(true);
        const timer = window.setTimeout(() => setFlipping(false), 280);

        return () => window.clearTimeout(timer);
    }, [page, surface]);

    // --- Paint the page underneath the ink -------------------------------
    useEffect(() => {
        const canvas = paperRef.current;

        if (canvas === null || box.width === 0) {
            return;
        }

        if (isPdf) {
            if (!pdf.loading) {
                pdf.paint(canvas, page, box.width);
            }

            return;
        }

        const context = canvas.getContext('2d');

        if (context === null) {
            return;
        }

        const pixelRatio = canvasPixelRatio();
        canvas.width = Math.round(box.width * pixelRatio);
        canvas.height = Math.round(box.height * pixelRatio);
        drawPaper(context, canvas.width, canvas.height, pixelRatio);
    }, [box.width, box.height, isPdf, page, pdf.loading, pdf.paint, surface]);

    // --- Repaint the ink on top ------------------------------------------
    useEffect(() => {
        const canvas = inkRef.current;

        if (canvas === null || box.width === 0) {
            return;
        }

        const context = canvas.getContext('2d');

        if (context === null) {
            return;
        }

        const pixelRatio = canvasPixelRatio();
        const pixelWidth = Math.round(box.width * pixelRatio);
        const pixelHeight = Math.round(box.height * pixelRatio);

        // Resizing clears the bitmap, so only touch it when the size really changed.
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);

        for (const stroke of strokes) {
            if (stroke.surface === surface && stroke.page === page) {
                drawStroke(context, stroke, canvas.width, canvas.height);
            }
        }

        if (draftRef.current !== null) {
            drawStroke(context, draftRef.current, canvas.width, canvas.height);
        }
    }, [box.width, box.height, page, surface, strokes, version]);

    // --- Pointer handling -------------------------------------------------

    function pointFromClient(clientX: number, clientY: number): [number, number] | null {
        const canvas = inkRef.current;

        if (canvas === null) {
            return null;
        }

        const rect = canvas.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            return null;
        }

        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;

        return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
    }

    function pointFor(event: React.PointerEvent<HTMLCanvasElement>): [number, number] | null {
        return pointFromClient(event.clientX, event.clientY);
    }

    function updateLocalCursor(point: [number, number] | null): void {
        const node = cursorRef.current;

        if (node !== null) {
            if (point === null || !canDraw || !['pen', 'marker', 'eraser'].includes(tool)) {
                node.style.opacity = '0';
            } else {
                const brushWidth = tool === 'eraser' ? eraserWidth : width;
                const size = Math.max(tool === 'eraser' ? 18 : 8, brushWidth * box.width);

                node.style.left = `${point[0] * 100}%`;
                node.style.top = `${point[1] * 100}%`;
                node.style.width = `${size}px`;
                node.style.height = `${size}px`;
                node.style.opacity = '1';
            }
        }

        const spotlight = spotlightRef.current;

        if (spotlight !== null) {
            if (point === null || !canDraw || tool !== 'spotlight') {
                spotlight.style.opacity = '0';
            } else {
                spotlight.style.background = spotlightGradient(point, spotlightRadius);
                spotlight.style.opacity = '1';
            }
        }
    }

    function sendCursor(point: [number, number] | null): void {
        const stamp = Date.now();

        if (point !== null && stamp - lastCursor.current < CURSOR_INTERVAL_MS) {
            return;
        }

        lastCursor.current = stamp;
        onCursor(point);
    }

    function commitText(): void {
        const draft = textDraft;
        const value = draft?.value.trim() ?? '';

        setTextDraft(null);

        if (draft === null || value === '' || !canDraw) {
            return;
        }

        onStroke({
            id: newStrokeId(),
            tool: 'text',
            color,
            width,
            surface,
            page,
            points: [[draft.x, draft.y]],
            text: value,
        });
        setVersion((current) => current + 1);
    }

    function startStroke(event: React.PointerEvent<HTMLCanvasElement>): void {
        if (!canDraw || (event.pointerType === 'mouse' && event.button !== 0)) {
            return;
        }

        const point = pointFor(event);

        if (point === null) {
            return;
        }

        event.preventDefault();
        updateLocalCursor(point);
        sendCursor(point);

        // The spotlight just follows the pointer; it does not make ink.
        if (tool === 'spotlight') {
            return;
        }

        // The text tool plants an anchor; it does not drag ink.
        if (tool === 'text') {
            if (textDraft !== null) {
                commitText();
            }

            setTextDraft({ x: point[0], y: point[1], value: '' });

            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        const strokeWidth = tool === 'eraser' ? eraserWidth : width;

        draftRef.current = {
            id: newStrokeId(),
            tool,
            color: tool === 'laser' ? LASER_COLOR : color,
            width: strokeWidth,
            surface,
            page,
            points: [point],
            at: Date.now(),
        };
        setVersion((current) => current + 1);
    }

    function extendStroke(event: React.PointerEvent<HTMLCanvasElement>): void {
        const point = pointFor(event);

        if (point === null) {
            return;
        }

        updateLocalCursor(point);

        const draft = draftRef.current;

        if (draft === null || !canDraw) {
            if (canDraw) {
                sendCursor(point);
            }

            return;
        }

        const native = event.nativeEvent;
        const coalesced = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
        const samples = coalesced.length > 0 ? coalesced : [native];
        const freehand =
            draft.tool === 'pen' || draft.tool === 'marker' || draft.tool === 'eraser' || draft.tool === 'laser';
        let lastPoint = point;
        let changed = false;

        if (draft.tool === 'laser') {
            draft.at = Date.now();
        }

        for (const sample of samples) {
            const next = pointFromClient(sample.clientX, sample.clientY);

            if (next === null) {
                continue;
            }

            lastPoint = next;

            if (freehand) {
                const last = draft.points[draft.points.length - 1];

                if (last !== undefined && Math.hypot(last[0] - next[0], last[1] - next[1]) < 0.0015) {
                    continue;
                }

                draft.points.push(next);
                changed = true;
            } else {
                // Shapes only need the start and the live endpoint, not every
                // sample in between.
                draft.points[1] = next;
                changed = true;
            }
        }

        sendCursor(lastPoint);

        if (changed) {
            setVersion((current) => current + 1);
        }
    }

    function endStroke(event: React.PointerEvent<HTMLCanvasElement>): void {
        const draft = draftRef.current;
        draftRef.current = null;

        if (draft === null) {
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        // A shape needs two distinct endpoints; a dot is the better answer.
        if (
            ['rect', 'ellipse', 'line', 'arrow'].includes(draft.tool) &&
            draft.points.length === 2 &&
            Math.hypot(draft.points[0][0] - draft.points[1][0], draft.points[0][1] - draft.points[1][1]) < 0.001
        ) {
            draft.points.pop();
        }

        if (draft.tool === 'laser') {
            draft.at = Date.now();
        }

        onStroke(draft);
        sendCursor(null);

        if (event.pointerType === 'touch') {
            updateLocalCursor(null);
        }

        setVersion((current) => current + 1);
    }

    // Same formula the canvas uses, so the draft box matches the committed text.
    const textPx = Math.max(12, Math.min(160, width * box.width * 6));
    const showBrushCursor = canDraw && ['pen', 'marker', 'eraser'].includes(tool);

    return (
        <div
            ref={wrapRef}
            className={cn(
                // Pinned to the stage box so the sheet sizes from real pixels,
                // not from a flex chain that may collapse mid-layout.
                'absolute inset-0 flex items-center overflow-hidden',
                zoomed ? 'justify-start overflow-x-auto overscroll-x-contain' : 'justify-center',
            )}
        >
            <div
                className={cn('board-paper board-surface relative', flipping && 'page-flip')}
                style={{
                    width: box.width > 0 ? box.width : undefined,
                    height: box.height > 0 ? box.height : undefined,
                    cursor: canDraw
                        ? tool === 'text'
                            ? 'text'
                            : showBrushCursor
                              ? 'none'
                              : 'crosshair'
                        : 'default',
                }}
            >
                <canvas ref={paperRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
                <canvas
                    ref={inkRef}
                    className="absolute inset-0 h-full w-full touch-none"
                    onPointerDown={startStroke}
                    onPointerMove={extendStroke}
                    onPointerUp={endStroke}
                    onPointerCancel={endStroke}
                    onPointerLeave={(event) => {
                        updateLocalCursor(null);
                        sendCursor(null);

                        if (event.buttons === 0) {
                            endStroke(event);
                        }
                    }}
                    onPointerEnter={(event) => {
                        const point = pointFor(event);

                        if (point !== null) {
                            updateLocalCursor(point);
                            sendCursor(point);
                        }
                    }}
                    role="img"
                    aria-label="Shared class board. Draw with the pointer, or watch what the instructor and students draw."
                />
                {showBrushCursor ? (
                    <div
                        ref={cursorRef}
                        data-board-cursor="true"
                        aria-hidden="true"
                        className={cn(
                            'pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 opacity-0 shadow-[0_1px_4px_rgba(25,28,32,0.25)]',
                            tool === 'eraser'
                                ? 'border-ink/45 bg-ink/10'
                                : 'border-ink/50 bg-white/25',
                        )}
                    />
                ) : null}
                <div
                    ref={spotlightRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-[5] opacity-0 transition-opacity duration-150"
                />
                {remoteSpotlight?.cursor != null ? (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-[5]"
                        style={{ background: spotlightGradient(remoteSpotlight.cursor, spotlightRadius) }}
                    />
                ) : null}
                <CursorLayer frames={presence} now={now} page={page} surface={surface} />

                {textDraft !== null && canDraw ? (
                    <textarea
                        autoFocus
                        value={textDraft.value}
                        onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })}
                        onBlur={() => commitText()}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                commitText();
                            }

                            if (event.key === 'Escape') {
                                event.currentTarget.blur();
                            }

                            event.stopPropagation();
                        }}
                        placeholder="Type, then press Enter"
                        rows={2}
                        className="absolute z-10 min-w-[16ch] resize rounded-lg border-2 border-brand bg-white/95 px-2 py-1 leading-snug text-ink shadow-[0_8px_26px_rgba(0,0,0,0.25)] focus:outline-none"
                        style={{
                            left: `${textDraft.x * 100}%`,
                            top: `${textDraft.y * 100}%`,
                            fontSize: textPx,
                            transform: textDraft.y > 0.82 ? 'translateY(-110%)' : undefined,
                        }}
                    />
                ) : null}

                {pdf.loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <p className="text-sm font-medium text-ink-muted">Rendering the PDF page…</p>
                    </div>
                ) : null}

                {pdf.error !== null ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-6 text-center">
                        <p className="max-w-sm text-sm text-danger">{pdf.error}</p>
                    </div>
                ) : null}

                <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-medium text-white">
                    Page {page}
                </div>

                {canDraw ? null : (
                    <div className="pointer-events-none absolute top-2 right-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white">
                        View only
                    </div>
                )}
            </div>
        </div>
    );
}

/** Darken the sheet everywhere except a soft circle around the pointer. */
function spotlightGradient(point: [number, number], radius: number): string {
    const x = point[0] * 100;
    const y = point[1] * 100;
    const edge = radius + Math.max(70, radius * 0.45);

    return `radial-gradient(circle at ${x}% ${y}%, rgba(4,7,12,0) 0px, rgba(4,7,12,0) ${radius}px, rgba(4,7,12,0.64) ${edge}px)`;
}
