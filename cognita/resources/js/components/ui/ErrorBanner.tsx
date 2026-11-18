import { usePage } from '@inertiajs/react';
import { WarningCircle } from '@phosphor-icons/react';
import type { SharedProps } from '@/types';

/**
 * The server's validation errors, shown once at the top of the page.
 *
 * A composer reports its own field errors next to the field, but the quick
 * actions in the console — a role change, a publish toggle, a key rotation —
 * have no field of their own. Without this banner their failure is silent.
 */
export default function ErrorBanner() {
    const { errors } = usePage<SharedProps>().props;

    const messages = Object.values(errors ?? {})
        .map((message) => (typeof message === 'string' ? message : ''))
        .filter((message) => message.trim() !== '');

    if (messages.length === 0) {
        return null;
    }

    return (
        <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft/60 px-4 py-3"
        >
            <WarningCircle
                size={17}
                weight="fill"
                className="mt-0.5 shrink-0 text-danger"
                aria-hidden="true"
            />
            <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">That did not work</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                    {messages.map((message) => (
                        <li key={message} className="text-[12.5px] leading-relaxed text-ink-muted">
                            {message}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
