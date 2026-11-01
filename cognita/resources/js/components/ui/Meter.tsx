import { cn } from '@/lib/utils';

interface MeterProps {
    value: number | string;
    label?: string;
    tone?: 'auto' | 'accent' | 'warn' | 'danger';
    className?: string;
}

export default function Meter({ value, label, tone = 'auto', className }: MeterProps) {
    const probability = Math.max(0, Math.min(1, Number(value ?? 0)));
    const pct = Math.round(probability * 100);

    const fill =
        tone === 'danger' || (tone === 'auto' && probability < 0.4)
            ? 'meter-fill meter-fill-danger'
            : tone === 'warn' || (tone === 'auto' && probability < 0.6)
              ? 'meter-fill meter-fill-warn'
              : 'meter-fill';

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div
                className="meter"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label ?? 'Mastery'}
            >
                <div className={fill} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-xs text-zinc-600 tabular-nums">{pct}%</span>
        </div>
    );
}
