import { X } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Inline composer dialog. Small actions happen in place on the page; this is
 * reserved for create forms that need a moment of focus.
 */
export default function Modal({
    open,
    title,
    description,
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onCloseRef.current();
            }
        }

        document.addEventListener('keydown', onKey);
        panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();

        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-4 sm:items-center" role="presentation">
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative z-10 max-h-[86vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-xl border border-line bg-surface p-5 shadow-float sm:rounded-xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">{title}</h2>
                        {description ? <p className="page-sub mt-1">{description}</p> : null}
                    </div>
                    <button type="button" onClick={onClose} className="btn btn-quiet btn-icon btn-sm" aria-label="Close">
                        <X size={16} weight="bold" aria-hidden="true" />
                    </button>
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}
