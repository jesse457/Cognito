import { useCallback, useEffect, useMemo, useRef } from 'react';
import { leaveAttendance, pingAttendance } from '@/lib/api';
import type { AttendanceSession } from '@/realtime';

const PING_MS = 60_000;

/**
 * The automatic attendance record a student's call creates.
 *
 * A ping every minute keeps it open, `pagehide` closes it, and a browser that
 * dies without saying goodbye is closed by the export's own cut-off.
 */
export interface AttendanceApi {
    start: (session: AttendanceSession) => void;
    stop: () => void;
}

export function useAttendance(): AttendanceApi {
    const session = useRef<AttendanceSession | null>(null);
    const timer = useRef<number | null>(null);

    const stop = useCallback(() => {
        if (timer.current !== null) {
            window.clearInterval(timer.current);
            timer.current = null;
        }

        const current = session.current;
        session.current = null;

        if (current !== null) {
            leaveAttendance(current);
        }
    }, []);

    const start = useCallback(
        (next: AttendanceSession) => {
            // The room heartbeat can hand us the same row every few seconds.
            // Keep its timer and the browser's leave state untouched.
            if (session.current?.id === next.id) {
                return;
            }

            stop();
            session.current = next;
            timer.current = window.setInterval(() => {
                if (session.current !== null) {
                    pingAttendance(session.current);
                }
            }, PING_MS);
        },
        [stop],
    );

    useEffect(() => {
        window.addEventListener('pagehide', stop);

        return () => {
            window.removeEventListener('pagehide', stop);
            stop();
        };
    }, [stop]);

    return useMemo(() => ({ start, stop }), [start, stop]);
}
