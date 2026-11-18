import { CheckCircle, Info, Warning, WarningCircle, X } from '@phosphor-icons/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/utils';

/**
 * Pop-ups for things that just happened.
 *
 * One toast for the whole product. The live call has a lot to say ("the
 * instructor handed you the pen", "you were muted", "the room ended") and so
 * does everything else ("the class was created", "your answer was accepted"),
 * so there is a single notification shape that every action reports through —
 * including the one-shot messages the server sends back.
 *
 * It sits in the middle of the screen, where a message that matters cannot be
 * missed, and it says itself with an icon that arrives rather than appears.
 */
export type ToastTone = 'info' | 'success' | 'warn' | 'error';

export interface ToastInput {
    title: string;
    description?: string;
    tone?: ToastTone;
    /** Milliseconds on screen; 0 keeps it until it is dismissed. */
    duration?: number;
    action?: { label: string; onClick: () => void };
}

interface Toast extends ToastInput {
    id: number;
}

interface ToastContextValue {
    push: (input: ToastInput) => void;
    dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = {
    info: Info,
    success: CheckCircle,
    warn: Warning,
    error: WarningCircle,
} as const;

const TONE_RING: Record<ToastTone, string> = {
    info: 'border-line bg-surface/97 text-ink',
    success: 'border-live/30 bg-live-soft text-live',
    warn: 'border-warn/30 bg-warn-soft text-warn',
    error: 'border-danger/30 bg-danger-soft text-danger',
};

const TONE_HALO: Record<ToastTone, string> = {
    info: 'bg-ink/10',
    success: 'bg-live/25',
    warn: 'bg-warn/25',
    error: 'bg-danger/25',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(1);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (input: ToastInput) => {
            const id = nextId.current++;
            const duration = input.duration ?? 5_000;

            // Keep the stack short: an old note is replaced by the new one.
            setToasts((current) => [...current.slice(-2), { duration, ...input, id }]);

            if (duration > 0) {
                window.setTimeout(() => dismiss(id), duration);
            }
        },
        [dismiss],
    );

    const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2.5 px-3 pt-4 sm:pt-6"
                role="region"
                aria-label="Notifications"
            >
                {toasts.map((toast) => (
                    <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);

    if (context === null) {
        throw new Error('useToast must be used inside <ToastProvider>.');
    }

    return context;
}

/**
 * Report something that did not work.
 *
 * The server already explains itself in the error it sent, so the toast shows
 * that sentence rather than making the reader guess.
 */
export function reportError(push: (input: ToastInput) => void, error: unknown): void {
    push({
        title: 'That did not work',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
    });
}

export function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const tone = toast.tone ?? 'info';
    const Icon = TONE_ICON[tone];

    return (
        <div
            className={cn(
                'toast-in pointer-events-auto flex w-full max-w-lg items-start gap-3.5 rounded-2xl border px-5 py-4 shadow-float backdrop-blur',
                TONE_RING[tone],
            )}
            role={tone === 'error' ? 'alert' : 'status'}
        >
            <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
                <span
                    className={cn('toast-halo absolute inset-0 rounded-full', TONE_HALO[tone])}
                    aria-hidden="true"
                />
                <Icon size={22} weight="fill" className="toast-icon relative" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[14.5px] leading-snug font-semibold">{toast.title}</p>
                {toast.description ? (
                    <p className="mt-1 text-[13px] leading-relaxed opacity-80">{toast.description}</p>
                ) : null}
                {toast.action ? (
                    <button
                        type="button"
                        onClick={() => {
                            toast.action?.onClick();
                            onDismiss();
                        }}
                        className="mt-2 rounded-full bg-ink/10 px-3 py-1 text-[12px] font-semibold transition hover:bg-ink/15"
                    >
                        {toast.action.label}
                    </button>
                ) : null}
            </div>

            <button
                type="button"
                onClick={onDismiss}
                className="-mt-1 -mr-1 rounded-full p-1.5 opacity-50 transition hover:opacity-100"
                aria-label="Dismiss notification"
            >
                <X size={15} weight="bold" aria-hidden="true" />
            </button>
        </div>
    );
}
