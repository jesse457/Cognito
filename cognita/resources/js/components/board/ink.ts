import type { BoardStroke, BoardSurface } from '@/types';
import { LASER_TTL_MS } from '@/lib/board';

/**
 * Everything that puts pixels on the board canvas, as plain functions.
 *
 * Two sheets, both with a fixed shape so every device sees the same drawing: a
 * 4:3 blank canvas and an 8.5×11 letter page (which a PDF replaces with its own
 * ratio). Strokes are normalised — points in 0..1 — so the same stroke looks
 * identical on a phone and on a projector.
 */

// 4:3 rather than a wide 16:10 on purpose: the sheet is width-limited on a
// phone, so a taller ratio is simply more drawing room there, and it is still a
// natural shape on a projector. Every device uses this one value, so the same
// drawing looks the same everywhere.
export const CANVAS_RATIO = 4 / 3;

export const LETTER_RATIO = 8.5 / 11;

/** Retina rendering, capped so a 4K projector does not melt a laptop. */
export function canvasPixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
}

export function ratioForSurface(surface: BoardSurface): number {
    return surface === 'canvas' ? CANVAS_RATIO : LETTER_RATIO;
}

/** Text is sized from the stroke width fraction so it zooms with the board. */
export function strokeTextPx(stroke: BoardStroke, widthPx: number): number {
    return Math.max(12, Math.min(160, stroke.width * widthPx * 6));
}

export function fontFor(context: CanvasRenderingContext2D, px: number): string {
    context.font = `600 ${px}px 'Hanken Grotesk Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`;

    return context.font;
}

/** PDF.js uses these names when a newer render supersedes an older one. */
export function isRenderCancellation(error: unknown): boolean {
    return error instanceof Error && ['RenderingCancelledException', 'AbortException'].includes(error.name);
}

export function drawStroke(
    context: CanvasRenderingContext2D,
    stroke: BoardStroke,
    width: number,
    height: number,
): void {
    const points = stroke.points;

    if (points.length === 0) {
        return;
    }

    if (stroke.tool === 'text') {
        drawText(context, stroke, width, height);

        return;
    }

    if (stroke.tool === 'laser') {
        drawLaser(context, stroke, width, height);

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

    if (isShape(stroke.tool)) {
        drawShape(context, stroke, width, height);
        context.restore();

        return;
    }

    drawFreehand(context, points, width, height);
    context.restore();
}

/** The sheet behind the ink: a white page with a soft dot grid. */
export function drawPaper(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number,
): void {
    context.save();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    const gap = 26 * scale;
    context.fillStyle = '#e5eaf4';

    for (let x = gap; x < width; x += gap) {
        for (let y = gap; y < height; y += gap) {
            context.beginPath();
            context.arc(x, y, 1.1 * scale, 0, Math.PI * 2);
            context.fill();
        }
    }

    context.restore();
}

function isShape(tool: BoardStroke['tool']): boolean {
    return tool === 'rect' || tool === 'ellipse' || tool === 'line' || tool === 'arrow';
}

/** A laser is a bright, short-lived pointer: it glows and then disappears. */
function drawLaser(
    context: CanvasRenderingContext2D,
    stroke: BoardStroke,
    width: number,
    height: number,
): void {
    const age = stroke.at === undefined ? Number.POSITIVE_INFINITY : Date.now() - stroke.at;

    if (age >= LASER_TTL_MS) {
        return;
    }

    context.save();
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = Math.max(0.12, 1 - age / LASER_TTL_MS);
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = Math.max(2, stroke.width * width);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowColor = stroke.color;
    context.shadowBlur = Math.max(10, stroke.width * width * 2.5);
    drawFreehand(context, stroke.points, width, height);
    context.restore();
}

function drawText(
    context: CanvasRenderingContext2D,
    stroke: BoardStroke,
    width: number,
    height: number,
): void {
    const px = strokeTextPx(stroke, width);
    const [ax, ay] = stroke.points[0];

    context.save();
    context.fillStyle = stroke.color;
    fontFor(context, px);
    context.textBaseline = 'top';
    context.textAlign = 'left';

    const lines = (stroke.text ?? '').split('\n');

    for (let index = 0; index < lines.length; index += 1) {
        context.fillText(lines[index] ?? '', ax * width, ay * height + index * px * 1.2);
    }

    context.restore();
}

/** Shapes and the arrow span from the first point to the last. */
function drawShape(
    context: CanvasRenderingContext2D,
    stroke: BoardStroke,
    width: number,
    height: number,
): void {
    const points = stroke.points;

    if (points.length === 1) {
        const [x, y] = points[0];

        context.beginPath();
        context.arc(x * width, y * height, context.lineWidth / 2, 0, Math.PI * 2);
        context.fill();

        return;
    }

    const [x0, y0] = points[0];
    const [x1, y1] = points[points.length - 1];
    const left = Math.min(x0, x1) * width;
    const top = Math.min(y0, y1) * height;
    const boxWidth = Math.abs(x1 - x0) * width;
    const boxHeight = Math.abs(y1 - y0) * height;

    if (stroke.tool === 'rect') {
        context.beginPath();
        context.rect(left, top, boxWidth, boxHeight);
        context.stroke();

        return;
    }

    if (stroke.tool === 'ellipse') {
        context.beginPath();
        context.ellipse(
            left + boxWidth / 2,
            top + boxHeight / 2,
            boxWidth / 2,
            boxHeight / 2,
            0,
            0,
            Math.PI * 2,
        );
        context.stroke();

        return;
    }

    context.beginPath();
    context.moveTo(x0 * width, y0 * height);
    context.lineTo(x1 * width, y1 * height);
    context.stroke();

    if (stroke.tool !== 'arrow') {
        return;
    }

    // Two back-swept barbs make the head; the size follows the pen width.
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const head = Math.max(9, context.lineWidth * 4);

    for (const spread of [Math.PI * 0.82, -Math.PI * 0.82]) {
        context.beginPath();
        context.moveTo(x1 * width, y1 * height);
        context.lineTo(x1 * width + head * Math.cos(angle + spread), y1 * height + head * Math.sin(angle + spread));
        context.stroke();
    }
}

function drawFreehand(
    context: CanvasRenderingContext2D,
    points: Array<[number, number]>,
    width: number,
    height: number,
): void {
    if (points.length === 1) {
        const [x, y] = points[0];

        context.beginPath();
        context.arc(x * width, y * height, context.lineWidth / 2, 0, Math.PI * 2);
        context.fill();

        return;
    }

    context.beginPath();
    context.moveTo(points[0][0] * width, points[0][1] * height);

    // Quadratic segments through the midpoints turn mouse samples into a
    // continuous line instead of a chain of visible corners.
    for (let index = 1; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const midX = ((current[0] + next[0]) / 2) * width;
        const midY = ((current[1] + next[1]) / 2) * height;

        context.quadraticCurveTo(current[0] * width, current[1] * height, midX, midY);
    }

    const last = points[points.length - 1];
    context.lineTo(last[0] * width, last[1] * height);
    context.stroke();
}
