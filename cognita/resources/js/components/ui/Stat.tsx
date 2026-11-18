import { Link } from '@inertiajs/react';
import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatProps {
    /** What the number counts — read first, so keep it short. */
    label: string;
    /** The number itself, already formatted by the server when it is a duration. */
    value: ReactNode;
    /** One line of context: the window it covers, or what it is made of. */
    hint?: ReactNode;
    icon?: Icon;
    /** `live` tints the number and is reserved for rooms open right now. */
    tone?: 'neutral' | 'live';
    /** Makes the whole tile a link to the page that explains the number. */
    href?: string;
    /** Replaces the label colour, for a tile that means something special. */
    labelClassName?: string;
}

/**
 * One number on a dashboard.
 *
 * The anatomy is fixed so four of these read as one row rather than four
 * unrelated cards: label, value, context, icon. The value is the only element
 * that changes size, and the hint always says what the number is measuring —
 * a count with no window ("12 sessions") is not a metric anyone can act on.
 *
 * The tile carries no border of its own; the `.kpi-row` around it draws the
 * rules, so the row reads as one instrument rather than four boxes.
 */
export default function Stat({
    label,
    value,
    hint,
    icon: Glyph,
    tone = 'neutral',
    href,
    labelClassName,
}: StatProps) {
    const tile = (
        <div className={cn('stat', href !== undefined && 'transition hover:bg-surface-sunken/60')}>
            <div className="flex items-start justify-between gap-3">
                <p className={cn('text-[11.5px] font-medium text-ink-soft', labelClassName)}>{label}</p>
                {Glyph ? (
                    <span className="shrink-0 text-ink-soft">
                        <Glyph size={15} aria-hidden="true" />
                    </span>
                ) : null}
            </div>

            <p className={cn('stat-value', tone === 'live' && 'text-live')}>{value}</p>

            {hint !== undefined ? <p className="meta leading-snug">{hint}</p> : null}
        </div>
    );

    if (href === undefined) {
        return tile;
    }

    return (
        <Link
            href={href}
            className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
            {tile}
        </Link>
    );
}
