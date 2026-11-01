import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'tonal' | 'outline' | 'quiet' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
    primary: 'btn-primary',
    tonal: 'btn-tonal',
    outline: 'btn-outline',
    quiet: 'btn-quiet',
    danger: 'btn-danger',
};

const sizes: Record<Size, string> = {
    sm: 'btn-sm',
    md: '',
};

export function buttonClass(variant: Variant = 'outline', size: Size = 'md', className?: string): string {
    return cn('btn', variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    children: ReactNode;
}

export default function Button({ variant = 'outline', size = 'md', className, children, ...props }: ButtonProps) {
    return (
        <button {...props} type={props.type ?? 'button'} className={buttonClass(variant, size, className)}>
            {children}
        </button>
    );
}
