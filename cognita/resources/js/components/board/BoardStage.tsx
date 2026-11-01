import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { BoardStroke, BoardSurface } from '@/types';
import { cn } from '@/lib/utils';

interface BoardStageProps {
    surface: BoardSurface;
    documentUrl: string | null;
    page: number;
    strokes: BoardStroke[];
    canDraw: boolean;
    tool: BoardStroke['tool'];
    color: string;
    width: number;
    onStroke: (stroke: BoardStroke) => void;
    onPageCount: (pages: number) => void;
}

const LETTER_RATIO = 8.5 / 11;
const CANVAS_RATIO = 16 / 10;

/** Strokes are normalised, so the board looks identical at every window size. */
function drawStroke(context: CanvasRenderingContext2D, stroke: BoardStroke, width: number, height: number): void {
    const points = stroke.points;

    if (points.length === 0) {
        return;
    }

    context.save();
    context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    context.globalAlpha = stroke.tool === 'marker' ? 0.32 : 1;
    context.strokeStyle = stroke.tool === 'eraser' ? '#000000' : stroke.color;
    context.fillStyle = context.strokeStyle;
    context.lineWidth = Math.max(1, stroke.width * width);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (points.length === 1) {
        const [x, y] = points[0];

        context.beginPath();
        context.arc(x * width, y * height, context.lineWidth / 2, 0, Math.PI * 2);
        context.fill();
        context.restore();

        return;
    }

    context.beginPath();
    context.moveTo(points[0][0] * width, points[0][1] * height);

    for (let index = 1; index < points.length; index++) {
        context.lineTo(points[index][0] * width, points[index][1] * height);
    }

    context.stroke();
    context.restore();
}

function drawPaper(
    context: CanvasRenderingContext2D,
    surface: BoardSurface,
    width: number,
    height: number,
    scale: number,
): void {
    context.save();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    if (surface === 'notebook') {
        // Ruled page: one line every 34 CSS pixels, plus a margin rule.
        const lineGap = 34 * scale;
        context.strokeStyle = '#e3e9f4';
        context.lineWidth = Math.max(1, scale);

        for (let y = lineGap * 2; y < height; y += lineGap) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }

        context.strokeStyle = '#cdd8ea';
        context.beginPath();
        context.moveTo(width * 0.085, 0);
        context.lineTo(width * 0.085, height);
        context.stroke();
    } else {
        // Blank canvas: a soft dot grid for spatial reference.
        const gap = 26 * scale;
        context.fillStyle = '#e5eaf4';

        for (let x = gap; x < width; x += gap) {
            for (let y = gap; y < height; y += gap) {
                context.beginPath();
                context.arc(x, y, 1.1 * scale, 0, Math.PI * 2);
                context.fill();
            }
        }
    }

    context.restore();
}

export default function BoardStage({
    surface,
    documentUrl,
    page,
    strokes,
    canDraw,
    tool,
    color,
    width,
    onStroke,
    onPageCount,
}: BoardStageProps) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const backgroundRef = useRef<HTMLCanvasElement | null>(null);
    const inkRef = useRef<HTMLCanvasElement | null>(null);
    const draftRef = useRef<BoardStroke | null>(null);
    const pdfRef = useRef<PDFDocumentProxy | null>(null);
    const reportedPages = useRef<number>(0);

    const [box, setBox] = useState({ width: 0, height: 0 });
    const [ratio, setRatio] = useState(surface === 'canvas' ? CANVAS_RATIO : LETTER_RATIO);
    const [version, setVersion] = useState(0);
    const [loadingDocument, setLoadingDocument] = useState(false);
    const [documentError, setDocumentError] = useState<string | null>(null);

    const isPdf = surface === 'pdf' && documentUrl !== null;

    // --- Fit the sheet inside the stage without distorting the page --------
    useEffect(() => {
        const node = wrapRef.current;

        if (node === null) {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (!entry) {
                return;
            }

            const pad = entry.contentRect.width < 640 ? 8 : 20;
            const availableWidth = Math.max(160, entry.contentRect.width - pad * 2);
            const availableHeight = Math.max(200, entry.contentRect.height - pad * 2);

            let nextWidth = availableWidth;
            let nextHeight = nextWidth / ratio;

            if (nextHeight > availableHeight) {
                nextHeight = availableHeight;
                nextWidth = nextHeight * ratio;
            }

            setBox({ width: Math.round(nextWidth), height: Math.round(nextHeight) });
        });

        observer.observe(node);

        return () => observer.disconnect();
    }, [ratio]);

    // --- Load the PDF once, then derive the page ratio and page count ------
    useEffect(() => {
        let cancelled = false;

        if (!isPdf || documentUrl === null) {
            pdfRef.current = null;
            setDocumentError(null);

            return () => {
                cancelled = true;
            };
        }

        setLoadingDocument(true);
        setDocumentError(null);

        void (async () => {
            try {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url'))
                    .default;

                const pdf = await pdfjs.getDocument({ url: documentUrl }).promise;

                if (cancelled) {
                    void pdf.destroy();

                    return;
                }

                const firstPage = await pdf.getPage(1);
                const viewport = firstPage.getViewport({ scale: 1 });

                pdfRef.current = pdf;
                setRatio(viewport.width / viewport.height);

                if (reportedPages.current !== pdf.numPages) {
                    reportedPages.current = pdf.numPages;
                    onPageCount(pdf.numPages);
                }
            } catch {
                if (!cancelled) {
                    setDocumentError('This PDF could not be rendered. Ask your instructor to upload it again.');
                }
            } finally {
                if (!cancelled) {
                    setLoadingDocument(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPdf, documentUrl]);

    // --- Paint the page background ---------------------------------------
    useEffect(() => {
        const canvas = backgroundRef.current;

        if (canvas === null || box.width === 0) {
            return;
        }

        const ratioToPixels = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext('2d');

        if (context === null) {
            return;
        }

        if (!isPdf) {
            canvas.width = Math.round(box.width * ratioToPixels);
            canvas.height = Math.round(box.height * ratioToPixels);
            drawPaper(context, surface, canvas.width, canvas.height, ratioToPixels);

            return;
        }

        const pdf = pdfRef.current;

        if (pdf === null || loadingDocument) {
            return;
        }

        let cancelled = false;

        void (async () => {
            try {
                const pageIndex = Math.min(Math.max(1, page), pdf.numPages);
                const pdfPage = await pdf.getPage(pageIndex);

                if (cancelled) {
                    return;
                }

                const base = pdfPage.getViewport({ scale: 1 });
                const scale = (box.width * ratioToPixels) / base.width;
                const viewport = pdfPage.getViewport({ scale });

                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);

                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);

                await pdfPage.render({ canvasContext: context, viewport }).promise;
            } catch {
                if (!cancelled) {
                    setDocumentError('This page could not be rendered.');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [box.width, box.height, isPdf, page, loadingDocument, surface]);

    // --- Repaint the annotation layer ------------------------------------
    useEffect(() => {
        const canvas = inkRef.current;

        if (canvas === null || box.width === 0) {
            return;
        }

        const context = canvas.getContext('2d');

        if (context === null) {
            return;
        }

        const ratioToPixels = Math.min(window.devicePixelRatio || 1, 2);

        if (canvas.width !== Math.round(box.width * ratioToPixels)) {
            canvas.width = Math.round(box.width * ratioToPixels);
            canvas.height = Math.round(box.height * ratioToPixels);
        }

        context.clearRect(0, 0, canvas.width, canvas.height);

        for (const stroke of strokes) {
            if (stroke.page === page) {
                drawStroke(context, stroke, canvas.width, canvas.height);
            }
        }

        if (draftRef.current !== null) {
            drawStroke(context, draftRef.current, canvas.width, canvas.height);
        }
    }, [box.width, box.height, page, strokes, version]);

    function pointFor(event: React.PointerEvent<HTMLCanvasElement>): [number, number] | null {
        const canvas = inkRef.current;

        if (canvas === null) {
            return null;
        }

        const rect = canvas.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            return null;
        }

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
    }

    function startStroke(event: React.PointerEvent<HTMLCanvasElement>): void {
        if (!canDraw) {
            return;
        }

        const point = pointFor(event);

        if (point === null) {
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        draftRef.current = {
            id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
            tool,
            color,
            width,
            page,
            points: [point],
        };
        setVersion((current) => current + 1);
    }

    function extendStroke(event: React.PointerEvent<HTMLCanvasElement>): void {
        if (!canDraw || draftRef.current === null) {
            return;
        }

        const point = pointFor(event);

        if (point === null) {
            return;
        }

        const points = draftRef.current.points;
        const last = points[points.length - 1];

        // Skip sub-pixel moves so a slow hand does not flood the payload.
        if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.0015) {
            return;
        }

        points.push(point);
        setVersion((current) => current + 1);
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

        onStroke(draft);
        setVersion((current) => current + 1);
    }

    return (
        <div ref={wrapRef} className="flex h-full w-full items-center justify-center overflow-hidden">
            <div
                className="board-surface relative"
                style={{
                    width: box.width > 0 ? box.width : undefined,
                    height: box.height > 0 ? box.height : undefined,
                    cursor: canDraw ? 'crosshair' : 'default',
                }}
            >
                <canvas ref={backgroundRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
                <canvas
                    ref={inkRef}
                    className="absolute inset-0 h-full w-full touch-none"
                    onPointerDown={startStroke}
                    onPointerMove={extendStroke}
                    onPointerUp={endStroke}
                    onPointerCancel={endStroke}
                    onPointerLeave={(event) => {
                        if (event.buttons === 0) {
                            endStroke(event);
                        }
                    }}
                    role="img"
                    aria-label="Shared class board. Draw with the pointer, or view what the instructor and students draw."
                />

                {loadingDocument ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <p className="text-sm font-medium text-ink-muted">Rendering the PDF page…</p>
                    </div>
                ) : null}

                {documentError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-6 text-center">
                        <p className="max-w-sm text-sm text-danger">{documentError}</p>
                    </div>
                ) : null}

                <div className={cn('pointer-events-none absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium', 'bg-ink/70 text-white')}>
                    Page {page}
                </div>

                {!canDraw ? (
                    <div className="pointer-events-none absolute top-2 right-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white">
                        View only
                    </div>
                ) : null}
            </div>
        </div>
    );
}
