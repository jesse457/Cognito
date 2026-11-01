import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatProps {
    label: string;
    value: ReactNode;
    hint?: string;
    tone?: 'default' | 'danger' | 'warn' | 'success' | 'accent';
    className?: string;
}

const tones = {
    default: 'text-zinc-900',
    danger: 'text-red-700',
    warn: 'text-amber-700',
    success: 'text-emerald-700',
    accent: 'text-teal-800',
} as const;

export default function Stat({ label, value, hint, tone = 'default', className }: StatProps) {
    return (
        <div className={cn('kpi', className)}>
            <p className="kpi-label">{label}</p>
            <p className={cn('kpi-value', tones[tone])}>{value}</p>
            {hint ? <p className="kpi-hint">{hint}</p> : null}
        </div>
    );
}
