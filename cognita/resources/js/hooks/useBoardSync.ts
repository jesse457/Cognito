import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ApiError, patchJson } from '@/lib/http';
import type { BoardState, BoardSurface } from '@/types';

const DEBOUNCE_MS = 600;

/**
 * The parts of the board the server accepts as a partial update.
 *
 * Note what is missing: ink. Drawings travel over the realtime channel and are
 * never written down, so this is the whole durable surface of a class board.
 */
export interface BoardPatch {
    surface?: BoardSurface;
    page?: number;
    pages?: number;
    students_can_annotate?: boolean;
}

export interface SaveOptions {
    /** Bypass the debounce: surface changes and page flips are worth a round trip. */
    immediate?: boolean;
}

export interface BoardSync {
    save: (patch: BoardPatch, options?: SaveOptions) => void;
    /** Drop anything queued — the room ended, so there is nothing to save. */
    drop: () => void;
}

/**
 * Saving the board, batched.
 *
 * Only settings reach this file — surface, page, page count, the draw
 * permission — so a lesson usually produces a handful of requests in total. A
 * fast hand produces none at all: strokes are realtime frames and are gone when
 * the room closes.
 */
export function useBoardSync(
    url: string,
    onError: (message: string) => void,
    /** The server's answer: it may have opened a room while saving. */
    onSaved?: (state: BoardState) => void,
): BoardSync {
    const queued = useRef<BoardPatch>({});
    const timer = useRef<number | null>(null);
    const inFlight = useRef(false);
    /** Bumped by every edit, so an older answer is never adopted over a newer one. */
    const revision = useRef(0);
    const flushRef = useRef<() => void>(() => undefined);
    const handleError = useRef(onError);
    handleError.current = onError;
    const handleSaved = useRef(onSaved);
    handleSaved.current = onSaved;

    const flush = useCallback(() => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }

        // One request at a time: the server must see the surface and page in
        // the order the instructor changed them.
        if (inFlight.current) {
            return;
        }

        const patch = queued.current;
        queued.current = {};

        if (Object.keys(patch).length === 0) {
            return;
        }

        const sentAt = revision.current;
        inFlight.current = true;

        void patchJson<BoardState>(url, patch)
            .then((state) => {
                // A newer edit superseded this answer; its own response will
                // carry the final surface and page.
                if (revision.current === sentAt) {
                    handleSaved.current?.(state);
                }
            })
            .catch((error: unknown) => {
                if (error instanceof ApiError && error.status < 500) {
                    handleError.current(error.message);
                }
                // Network failures are retried by the next edit.
            })
            .finally(() => {
                inFlight.current = false;

                if (Object.keys(queued.current).length > 0) {
                    flushRef.current();
                }
            });
    }, [url]);

    flushRef.current = flush;

    const save = useCallback(
        (patch: BoardPatch, options: SaveOptions = {}) => {
            revision.current += 1;
            queued.current = { ...queued.current, ...patch };

            if (options.immediate === true) {
                flush();

                return;
            }

            // A request already on the wire will pick this up when it lands.
            if (inFlight.current) {
                return;
            }

            if (timer.current !== null) {
                window.clearTimeout(timer.current);
            }

            timer.current = window.setTimeout(flush, DEBOUNCE_MS);
        },
        [flush],
    );

    const drop = useCallback(() => {
        revision.current += 1;
        queued.current = {};

        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);

    useEffect(() => drop, [drop]);

    return useMemo(() => ({ save, drop }), [save, drop]);
}
