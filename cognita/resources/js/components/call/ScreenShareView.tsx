import { MonitorArrowUp } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import type { CallParticipant } from '@/realtime';

/**
 * One shared screen, painted by the browser's own video element.
 *
 * The transport hands the React layer a MediaStreamTrack, not a LiveKit track,
 * so this component never imports the call SDK. The element is muted because the
 * shared tab's audio, when the browser captures it, travels as its own audio
 * track and is played by the transport.
 *
 * This component also owns one piece of data policy: it is the only place that
 * knows how big the share is actually drawn, so it reports that upward and the
 * transport asks the call server for a layer that fits. A student watching on a
 * phone then receives the small rung instead of a full 720p desktop feed.
 */
export default function ScreenShareView({
    participant,
    onSize,
}: {
    participant: CallParticipant;
    /** Reported in CSS pixels once the element has a real box. */
    onSize?: (width: number, height: number) => void;
}) {
    const video = useRef<HTMLVideoElement | null>(null);
    const track = participant.screenShare;

    useEffect(() => {
        const element = video.current;

        if (element === null || track === null) {
            return;
        }

        element.srcObject = new MediaStream([track]);
        void element.play().catch(() => {});

        return () => {
            element.srcObject = null;
        };
    }, [track]);

    // Report the drawn size, and again whenever it changes. ResizeObserver is
    // what makes this correct: the box changes on window resize, on rotating a
    // phone, and when the comments panel opens, which a window listener misses.
    useEffect(() => {
        const element = video.current;

        if (element === null || onSize === undefined) {
            return;
        }

        const report = (): void => {
            const rect = element.getBoundingClientRect();

            if (rect.width > 0 && rect.height > 0) {
                onSize(rect.width, rect.height);
            }
        };

        report();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(report);
        observer.observe(element);

        return () => observer.disconnect();
    }, [onSize, track]);

    return (
        <div
            data-screen-stage
            className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-stage-line bg-black shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
        >
            <video ref={video} autoPlay playsInline muted className="h-full w-full object-contain" />

            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
                <MonitorArrowUp size={13} weight="fill" aria-hidden="true" />
                {participant.name}
                {participant.isLocal ? ' (you)' : ''} is sharing
            </span>
        </div>
    );
}
