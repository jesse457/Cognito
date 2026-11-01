import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
    label: string;
    htmlFor?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
    return (
        <div className={cn('min-w-0', className)}>
            <label htmlFor={htmlFor} className="label">
                {label}
                {required ? <span className="text-red-600"> *</span> : null}
            </label>
            {children}
            {hint && !error ? <p className="hint">{hint}</p> : null}
            {error ? <p className="error">{error}</p> : null}
        </div>
    );
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="page-title">{title}</h1>
                {subtitle ? <p className="page-sub">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}

export const inputClass = 'input';
export const selectClass = 'select';
