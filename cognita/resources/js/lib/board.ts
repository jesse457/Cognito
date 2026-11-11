import type { BoardStroke, BoardSurface, BoardTool } from '@/types';

/** Board constants and the small pure helpers the board components share. */

export const SURFACE_LABEL: Record<BoardSurface, string> = {
    canvas: 'Canvas',
    pdf: 'PDF',
};

export const TOOLS: Array<{ value: BoardTool; label: string }> = [
    { value: 'pen', label: 'Pen' },
    { value: 'marker', label: 'Highlighter' },
    { value: 'laser', label: 'Laser' },
    { value: 'spotlight', label: 'Spotlight' },
    { value: 'eraser', label: 'Eraser' },
    { value: 'line', label: 'Line' },
    { value: 'arrow', label: 'Arrow' },
    { value: 'rect', label: 'Rectangle' },
    { value: 'ellipse', label: 'Ellipse' },
    { value: 'text', label: 'Text' },
];

export const INK_COLORS = ['#191c20', '#0b57d0', '#1a7f3c', '#b3261e', '#9a6a00'];

export const INK_WIDTHS = [0.0025, 0.005, 0.009];

/** Erasers are deliberately much wider than any pen: 40, 80 and 140 px at a 1000 px sheet. */
export const ERASER_WIDTHS = [0.04, 0.08, 0.14];

export const ZOOM = { min: 1, max: 3, step: 0.25 } as const;

/** How long a laser trail stays on the sheet before it fades away. */
export const LASER_TTL_MS = 1_800;

/** A laser is a pointer, not ink: red and glowing whatever the pen colour is. */
export const LASER_COLOR = '#e11d48';

/** Pages a surface has: one canvas, or as many as the PDF reports. */
export function pagesForSurface(surface: BoardSurface, documentPages = 1): number {
    return surface === 'pdf' ? Math.max(1, documentPages) : 1;
}

export function sortStrokes(strokes: BoardStroke[]): BoardStroke[] {
    return [...strokes].sort((left, right) => left.id - right.id);
}

let lastId = 0;

/**
 * Stroke ids order the board and de-duplicate echoes. A timestamp plus a
 * counter is enough: ids only have to be unique within a room, and monotonic so
 * a late arrival still sorts after what was drawn before it.
 */
export function nextStrokeId(): number {
    lastId = Math.max(Date.now() * 1000 + (lastId % 1000) + 1, lastId + 1);

    return lastId;
}
