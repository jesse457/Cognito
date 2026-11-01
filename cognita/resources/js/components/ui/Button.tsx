import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
};

const sizes: Record<Size, string> = {
    sm: 'btn-sm',
    md: '',
};

export function buttonStyles(variant: Variant = 'secondary', size: Size = 'md', className?: string): string {
    return cn('btn', variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    children: ReactNode;
}

export default function Button({ variant = 'secondary', size = 'md', className, children, ...props }: ButtonProps) {
    return (
        <button type={props.type ?? 'button'} {...props} className={buttonStyles(variant, size, className)}>
            {children}
        </button>
    );
}
