import { usePage } from '@inertiajs/react';
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { SharedProps } from '@/types';

/** One-shot flash messages, rendered above the page content and dismissible. */
export default function Flash() {
    const { flash } = usePage<SharedProps>().props;
    const [dismissed, setDismissed] = useState<string | null>(null);

    const message = flash?.success ?? flash?.error ?? null;
    const tone = flash?.success ? 'success' : flash?.error ? 'error' : null;

    useEffect(() => {
        setDismissed(null);
    }, [message]);

    if (message === null || tone === null || dismissed === message) {
        return null;
    }

    return (
        <div
            className={tone === 'success' ? 'flash flash-success' : 'flash flash-error'}
            role={tone === 'success' ? 'status' : 'alert'}
        >
            {tone === 'success' ? (
                <CheckCircle size={18} weight="fill" className="mt-px shrink-0" aria-hidden="true" />
            ) : (
                <WarningCircle size={18} weight="fill" className="mt-px shrink-0" aria-hidden="true" />
            )}
            <p className="flex-1">{message}</p>
            <button
                type="button"
                onClick={() => setDismissed(message)}
                className="-mr-1 rounded-full p-1 opacity-60 transition hover:opacity-100"
                aria-label="Dismiss message"
            >
                <X size={14} weight="bold" aria-hidden="true" />
            </button>
        </div>
    );
}
