import { useCallback, useEffect, useRef, useState } from 'react';
import { PRESENCE_STALE_MS, type CallRole, type PresenceFrame } from '@/realtime';

const TICK_MS = 250;
const SWEEP_MS = 1_000;

export interface UsePresenceOptions {
    /** Off until the call is connected: nothing to publish to before that. */
    active: boolean;
    identity: string | null;
    name: string;
    role: CallRole;
    send: (frame: PresenceFrame) => void;
}

export interface PresenceApi {
    mine: PresenceFrame | null;
    /** Frames from everyone else, stale ones dropped. */
    frames: PresenceFrame[];
    /** A clock for staleness checks, refreshed once a second. */
    now: number;
    update: (patch: Partial<PresenceFrame>) => void;
    raiseHand: (raised: boolean) => void;
    accept: (frame: PresenceFrame) => void;
}

/**
 * Live cursors and raised hands.
 *
 * Presence is cheap and disposable: a frame every 250 ms, dropped after 15
 * seconds of silence, never persisted. Keeping it in its own hook means the
 * call hook only deals with connections and the board hook only with ink.
 */
export function usePresence(options: UsePresenceOptions): PresenceApi {
    const { active, identity, name, role } = options;
    const send = useRef(options.send);
    send.current = options.send;

    const mine = useRef<PresenceFrame | null>(null);
    const [frames, setFrames] = useState<PresenceFrame[]>([]);
    const [now, setNow] = useState(() => Date.now());

    const publish = useCallback((patch: Partial<PresenceFrame>) => {
        const current = mine.current;

        if (current === null) {
            return;
        }

        const next: PresenceFrame = { ...current, ...patch, ts: Date.now() };
        mine.current = next;
        send.current(next);
    }, []);

    const accept = useCallback((frame: PresenceFrame) => {
        setFrames((previous) => {
            const exists = previous.some((item) => item.identity === frame.identity);

            return exists
                ? previous.map((item) => (item.identity === frame.identity ? frame : item))
                : [...previous, frame];
        });
    }, []);

    const raiseHand = useCallback(
        (raised: boolean) => {
            publish({ handRaised: raised });
        },
        [publish],
    );

    // A frame of our own to keep warm while the call is open.
    useEffect(() => {
        if (!active || identity === null) {
            mine.current = null;

            return;
        }

        mine.current = {
            type: 'presence',
            identity,
            name,
            role,
            surface: 'canvas',
            page: 1,
            tool: 'pen',
            cursor: null,
            boardOpen: false,
            hidden: typeof document !== 'undefined' && document.hidden,
            handRaised: false,
            ts: Date.now(),
        };
        publish({});

        const timer = window.setInterval(
            () => publish({ hidden: typeof document !== 'undefined' && document.hidden }),
            TICK_MS,
        );

        return () => window.clearInterval(timer);
    }, [active, identity, name, role, publish]);

    // Drop frames nobody refreshed, and keep the staleness clock moving.
    useEffect(() => {
        const timer = window.setInterval(() => {
            const stamp = Date.now();

            setNow(stamp);
            setFrames((previous) => {
                const fresh = previous.filter((frame) => stamp - frame.ts < PRESENCE_STALE_MS);

                return fresh.length === previous.length ? previous : fresh;
            });
        }, SWEEP_MS);

        return () => window.clearInterval(timer);
    }, []);

    return { mine: mine.current, frames, now, update: publish, raiseHand, accept };
}
