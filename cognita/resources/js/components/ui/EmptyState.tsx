import type { ReactNode } from 'react';

export default function EmptyState({
    title,
    body,
    action,
}: {
    title: string;
    body: string;
    action?: ReactNode;
}) {
    return (
        <div className="empty">
            <p className="text-[13.5px] font-semibold text-ink">{title}</p>
            <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">{body}</p>
            {action ? <div className="mt-2.5">{action}</div> : null}
        </div>
    );
}
