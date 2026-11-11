import { useMemo } from 'react';
import { PRESENCE_STALE_MS, type PresenceFrame } from '@/realtime';
import { cn } from '@/lib/utils';
import type { BoardSurface } from '@/types';

const DOT_COLORS = ['#0b57d0', '#1a7f3c', '#b3261e', '#9a6a00', '#7c3aed'];

interface CursorLayerProps {
    frames: PresenceFrame[];
    now: number;
    /** Current sheet; cursors are only shown on the surface they are on. */
    surface: BoardSurface;
    /** Current page; cursors are only shown on the page they are drawing on. */
    page: number;
}

export default function CursorLayer({ frames, now, surface, page }: CursorLayerProps) {
    const live = useMemo(
        () =>
            frames.filter(
                (frame) =>
                    now - frame.ts < PRESENCE_STALE_MS &&
                    frame.surface === surface &&
                    frame.page === page &&
                    frame.cursor !== null &&
                    !frame.hidden,
            ),
        [frames, now, surface, page],
    );

    if (live.length === 0) return null;

    return (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
            {live.map((frame, index) => {
                const [x, y] = frame.cursor ?? [0, 0];

                // A laser talks for itself: a glowing dot is clearer than a name.
                if (frame.tool === 'laser') {
                    return (
                        <span
                            key={frame.identity}
                            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 shadow-[0_0_14px_5px_rgba(244,63,94,0.65)] ring-2 ring-white/80"
                            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                        />
                    );
                }

                if (frame.tool === 'spotlight') {
                    return null;
                }

                const color = DOT_COLORS[index % DOT_COLORS.length];
                return (
                    <span
                        key={frame.identity}
                        className={cn('absolute flex items-center gap-1 transition-all duration-150 ease-out will-change-transform')}
                        style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                    >
                        <span className="block h-3 w-3 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: color }} />
                        <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white shadow"
                            style={{ backgroundColor: color }}
                        >
                            {frame.name.split(' ')[0]}
                        </span>
                    </span>
                );
            })}
        </div>
    );
}
