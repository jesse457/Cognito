import { useCallback, useEffect, useState } from 'react';
import { postJson, requestData } from '@/lib/http';
import { routes } from '@/lib/routes';
import type { CreatePollInput, PollView } from '@/types';

const REFRESH_MS = 3_000;

export interface PollApi {
    polls: PollView[];
    active: PollView | null;
    refresh: () => Promise<void>;
    create: (input: CreatePollInput) => Promise<PollView>;
    respond: (pollId: number, response: { option_id?: number; body?: string }) => Promise<PollView>;
    close: (pollId: number) => Promise<PollView>;
}

/**
 * Polls live on the server while the class is open. A short poll gives the
 * room one source of truth and lets a late joiner see the same question and
 * timer as everyone else.
 */
export function usePolls(classroomId: number, active: boolean): PollApi {
    const [polls, setPolls] = useState<PollView[]>([]);

    const apply = useCallback((poll: PollView): void => {
        setPolls((current) => {
            const exists = current.some((item) => item.id === poll.id);

            return exists ? current.map((item) => (item.id === poll.id ? poll : item)) : [poll, ...current];
        });
    }, []);

    const refresh = useCallback(async (): Promise<void> => {
        if (!active) {
            setPolls([]);

            return;
        }

        try {
            const data = await requestData<{ polls: PollView[] }>(routes.callPolls(classroomId));
            setPolls(data.polls);
        } catch {
            /* the next tick tries again; a missed poll fetch is not a call failure */
        }
    }, [active, classroomId]);

    useEffect(() => {
        if (!active) {
            setPolls([]);

            return;
        }

        let cancelled = false;

        const load = async (): Promise<void> => {
            try {
                const data = await requestData<{ polls: PollView[] }>(routes.callPolls(classroomId));

                if (!cancelled) {
                    setPolls(data.polls);
                }
            } catch {
                /* keep the last good list */
            }
        };

        void load();
        const timer = window.setInterval(() => void load(), REFRESH_MS);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [active, classroomId]);

    const create = useCallback(
        async (input: CreatePollInput): Promise<PollView> => {
            const poll = await postJson<PollView>(routes.callPolls(classroomId), input);

            await refresh();

            return poll;
        },
        [classroomId, refresh],
    );

    const respond = useCallback(
        async (pollId: number, response: { option_id?: number; body?: string }): Promise<PollView> => {
            const poll = await postJson<PollView>(routes.callPollRespond(classroomId, pollId), response);

            apply(poll);

            return poll;
        },
        [apply, classroomId],
    );

    const close = useCallback(
        async (pollId: number): Promise<PollView> => {
            const poll = await postJson<PollView>(routes.callPollClose(classroomId, pollId), {});

            apply(poll);

            return poll;
        },
        [apply, classroomId],
    );

    return {
        polls,
        active: polls.find((poll) => poll.is_open) ?? null,
        refresh,
        create,
        respond,
        close,
    };
}
