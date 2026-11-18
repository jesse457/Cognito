import { ArrowRight, BellRinging, Clock, Hourglass } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * The waiting room.
 *
 * A student who enters a session the instructor announced waits here. Nothing
 * is recorded and nobody is heard until the instructor starts the session: the
 * page watches the room, and the moment it opens the student is offered the
 * call. A session that ends while somebody waits closes the door for good.
 */
export default function WaitingRoom({
    title,
    description,
    startsAt,
    host,
    touchUrl,
    onJoin,
    onEnded,
}: {
    title: string | null;
    /** What the session covers, written by the instructor. */
    description: string | null;
    /** Already phrased by the server: "Today · 15:00", "in 20 min". */
    startsAt: string | null;
    host: string | null;
    /** The heartbeat endpoint; it answers with the state of the session. */
    touchUrl: string;
    /** Called when the session opens and the student wants to come in. */
    onJoin: () => void;
    /** Called when the session is closed before it ever opened. */
    onEnded: () => void;
}) {
    const [state, setState] = useState<'waiting' | 'live' | 'passed'>('waiting');

    useEffect(() => {
        let cancelled = false;

        async function check(): Promise<void> {
            try {
                const response = await fetch(touchUrl, {
                    method: 'POST',
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });

                if (!response.ok) {
                    return;
                }

                const payload = (await response.json()) as { data?: { state?: string } };
                const next = payload.data?.state;

                if (cancelled || next === undefined) {
                    return;
                }

                if (next === 'live') {
                    setState('live');
                } else if (next === 'passed') {
                    setState('passed');
                    onEnded();
                }
            } catch {
                /* A missed check is not a failed wait: the next one comes round. */
            }
        }

        void check();
        const timer = window.setInterval(() => void check(), 5000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [onEnded, touchUrl]);

    return (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
            <div className="lobby-in w-full max-w-md rounded-xl border border-stage-line bg-stage-raised p-6 shadow-stage">
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg',
                            state === 'live' ? 'bg-stage-live/15 text-stage-live' : 'bg-stage-ink/10 text-stage-ink/70',
                        )}
                    >
                        {state === 'live' ? (
                            <BellRinging size={17} aria-hidden="true" />
                        ) : (
                            <Hourglass size={17} aria-hidden="true" />
                        )}
                    </span>
                    <p className="text-[11.5px] font-medium text-stage-ink/55">
                        {state === 'live' ? 'The session has started' : 'Waiting room'}
                    </p>
                </div>

                <h1 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-stage-ink">
                    {title ?? 'Your class session'}
                </h1>

                {startsAt !== null ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-stage-ink/55">
                        <Clock size={14} aria-hidden="true" />
                        {startsAt}
                        {host !== null ? ` · ${host}` : ''}
                    </p>
                ) : null}

                {description !== null ? (
                    <p className="mt-3 whitespace-pre-line rounded-lg border border-stage-ink/10 bg-stage-ink/5 px-3 py-2 text-[12px] leading-relaxed text-stage-ink/65">
                        {description}
                    </p>
                ) : null}

                {state === 'live' ? (
                    <>
                        <p className="mt-5 text-[13px] leading-relaxed text-stage-ink/70">
                            {host ?? 'Your instructor'} has opened the room. Join now to take part.
                        </p>
                        <button type="button" onClick={onJoin} className="join-button mt-5 w-full">
                            Join the session
                            <ArrowRight size={16} weight="bold" aria-hidden="true" />
                        </button>
                    </>
                ) : (
                    <>
                        <p className="mt-5 text-[13px] leading-relaxed text-stage-ink/70">
                            You are in the waiting room. The session opens when your instructor starts it, and you can
                            join from here the moment it does. Nothing is recorded while you wait.
                        </p>
                        <p className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-stage-ink/40">
                            <span className="live-dot" aria-hidden="true" />
                            Waiting for the room to open
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
