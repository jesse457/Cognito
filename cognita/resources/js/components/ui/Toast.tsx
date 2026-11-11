import { CheckCircle, Info, Warning, WarningCircle, X } from '@phosphor-icons/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pop-ups for things that just happened.
 *
 * The call page has a lot to say ("the instructor handed you the pen", "you
 * were muted", "the room ended") but a banner stack would eat the stage. A
 * toast says it once, in the corner, and gets out of the way.
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
    info: 'border-line bg-surface/95 text-ink',
    success: 'border-live/30 bg-live-soft text-live',
    warn: 'border-warn/30 bg-warn-soft text-warn',
    error: 'border-danger/30 bg-danger-soft text-danger',
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
                className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-3 sm:right-4 sm:left-auto sm:bottom-auto sm:top-4 sm:items-end"
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

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const Icon = TONE_ICON[toast.tone ?? 'info'];

    return (
        <div
            className={cn(
                'toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 shadow-float backdrop-blur',
                TONE_RING[toast.tone ?? 'info'],
            )}
            role={toast.tone === 'error' ? 'alert' : 'status'}
        >
            <Icon size={17} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug">{toast.title}</p>
                {toast.description ? (
                    <p className="mt-0.5 text-[12px] leading-relaxed opacity-75">{toast.description}</p>
                ) : null}
                {toast.action ? (
                    <button
                        type="button"
                        onClick={() => {
                            toast.action?.onClick();
                            onDismiss();
                        }}
                        className="mt-1.5 rounded-full bg-ink/10 px-2.5 py-1 text-[11px] font-semibold transition hover:bg-ink/15"
                    >
                        {toast.action.label}
                    </button>
                ) : null}
            </div>
            <button
                type="button"
                onClick={onDismiss}
                className="-mr-1 rounded-full p-1 opacity-60 transition hover:opacity-100"
                aria-label="Dismiss notification"
            >
                <X size={13} weight="bold" aria-hidden="true" />
            </button>
        </div>
    );
}
