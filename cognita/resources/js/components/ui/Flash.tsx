import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { SharedProps } from '@/types';

/**
 * The server's one-shot messages, reported through the same toast as
 * everything else.
 *
 * There is one way for the product to say something, and this is where the
 * server's half of it arrives.
 */
export default function Flash() {
    const { flash } = usePage<SharedProps>().props;
    const { push } = useToast();

    const message = flash?.success ?? flash?.error ?? null;
    const tone = flash?.success ? 'success' : 'error';

    useEffect(() => {
        if (message === null) {
            return;
        }

        push({ title: message, tone, duration: 6_000 });
    }, [message, push, tone]);

    return null;
}
