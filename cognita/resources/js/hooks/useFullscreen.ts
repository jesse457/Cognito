import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface FullscreenApi {
    /** The element owns the screen, natively or by the CSS fallback. */
    active: boolean;
    /** The browser has an element-level Fullscreen API. */
    native: boolean;
    toggle: () => void;
    exit: () => void;
}

/**
 * Fullscreen for one element, with a fallback that always works.
 *
 * iOS Safari has no element fullscreen, and a rejected request (an iframe, a
 * policy) must not leave a dead button behind, so both cases fall back to a
 * fixed overlay drawn by CSS. From the board's point of view the two are the
 * same state.
 */
export function useFullscreen(target: RefObject<HTMLElement | null>): FullscreenApi {
    const [nativeActive, setNativeActive] = useState(false);
    const [fallback, setFallback] = useState(false);

    const native = typeof document !== 'undefined' && document.fullscreenEnabled === true;

    useEffect(() => {
        function onFullscreenChange(): void {
            setNativeActive(document.fullscreenElement !== null);
        }

        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // Escape closes the fallback; the browser handles it natively otherwise.
    useEffect(() => {
        if (!fallback) {
            return;
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setFallback(false);
            }
        }

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [fallback]);

    const exit = useCallback(() => {
        setFallback(false);

        if (document.fullscreenElement !== null) {
            void document.exitFullscreen().catch(() => undefined);
        }
    }, []);

    const toggle = useCallback(() => {
        const element = target.current;

        if (native && element !== null) {
            if (document.fullscreenElement !== null) {
                exit();

                return;
            }

            void element.requestFullscreen().catch(() => setFallback((current) => !current));

            return;
        }

        setFallback((current) => !current);
    }, [exit, native, target]);

    return { active: nativeActive || fallback, native, toggle, exit };
}
