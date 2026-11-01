import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent';

const tones: Record<Tone, string> = {
    neutral: 'badge-neutral',
    success: 'badge-success',
    warn: 'badge-warn',
    danger: 'badge-danger',
    info: 'badge-info',
    accent: 'badge-accent',
};

interface BadgeProps {
    tone?: Tone;
    children: ReactNode;
    className?: string;
}

export function statusTone(status: string): Tone {
    switch (status) {
        case 'active':
        case 'published':
        case 'resolved':
        case 'open':
            return 'success';
        case 'suspended':
        case 'in_review':
        case 'draft':
            return 'warn';
        case 'banned':
        case 'removed':
            return 'danger';
        case 'archived':
        case 'dismissed':
            return 'neutral';
        default:
            return 'neutral';
    }
}

export function roleTone(role: string): Tone {
    switch (role) {
        case 'owner':
        case 'admin':
            return 'accent';
        case 'moderator':
            return 'info';
        case 'instructor':
            return 'warn';
        default:
            return 'neutral';
    }
}

export default function Badge({ tone = 'neutral', children, className }: BadgeProps) {
    return <span className={cn('badge', tones[tone], className)}>{children}</span>;
}
