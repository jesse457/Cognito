import type { ReactNode } from 'react';

interface EmptyStateProps {
    title: string;
    body?: string;
    action?: ReactNode;
}

export default function EmptyState({ title, body, action }: EmptyStateProps) {
    return (
        <div className="empty">
            <p className="empty-title">{title}</p>
            {body ? <p className="empty-body">{body}</p> : null}
            {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
        </div>
    );
}
