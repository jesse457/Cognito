import { WarningCircle } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ConfirmRequest {
    title: string;
    description?: string;
    confirmLabel?: string;
    tone?: 'danger' | 'default';
    onConfirm: () => void;
}

/**
 * The one destructive action in the call (removing someone), asked in a real
 * dialog rather than `window.confirm`, so it looks like the rest of the product
 * and can be dismissed with Escape.
 */
export default function ConfirmDialog({
    request,
    onClose,
}: {
    request: ConfirmRequest | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (request === null) {
            return;
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [request, onClose]);

    if (request === null) {
        return null;
    }

    const danger = request.tone === 'danger';

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Cancel" onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={request.title}
                className="dialog-in relative z-10 w-full max-w-sm rounded-xl border border-line bg-surface p-5 text-ink shadow-float"
            >
                <div className="flex items-start gap-3">
                    <span
                        className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            danger ? 'bg-danger-soft text-danger' : 'bg-surface-sunken text-ink-muted',
                        )}
                    >
                        <WarningCircle size={18} weight="fill" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">{request.title}</h2>
                        {request.description ? (
                            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{request.description}</p>
                        ) : null}
                    </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-quiet btn-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        autoFocus
                        onClick={() => {
                            request.onConfirm();
                            onClose();
                        }}
                        className={cn('btn btn-sm', danger ? 'btn-danger' : 'btn-primary')}
                    >
                        {request.confirmLabel ?? 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
