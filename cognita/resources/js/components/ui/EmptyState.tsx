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
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="max-w-sm text-sm text-ink-muted">{body}</p>
            {action ? <div className="mt-2">{action}</div> : null}
        </div>
    );
}
