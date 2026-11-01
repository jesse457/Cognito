import { cn, initialsOf } from '@/lib/utils';

export default function Avatar({
    name,
    size = 'md',
    tone = 'brand',
    className,
}: {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    tone?: 'brand' | 'neutral' | 'stage';
    className?: string;
}) {
    const sizes = {
        sm: 'h-7 w-7 text-[11px]',
        md: 'h-9 w-9 text-[13px]',
        lg: 'h-12 w-12 text-sm',
    } as const;

    const tones = {
        brand: 'bg-brand-soft text-brand',
        neutral: 'bg-surface-sunken text-ink-muted',
        stage: 'bg-white/12 text-white',
    } as const;

    return (
        <span className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold', sizes[size], tones[tone], className)} aria-hidden="true">
            {initialsOf(name)}
        </span>
    );
}
