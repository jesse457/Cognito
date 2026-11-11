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
}

/**
 * One Tier-1 number on a dashboard.
 *
 * The anatomy is fixed so four of these read as one row rather than four
 * unrelated cards: label, value, context, icon. The value is the only element
 * that changes size, and the hint always says what the number is measuring —
 * a count with no window ("12 sessions") is not a metric anyone can act on.
 */
export default function Stat({ label, value, hint, icon: Glyph, tone = 'neutral', href }: StatProps) {
    const tile = (
        <div className={cn('stat flex h-full flex-col gap-1', href !== undefined && 'transition hover:border-line-strong')}>
            <div className="flex items-start justify-between gap-3">
                <p className="eyebrow">{label}</p>
                {Glyph ? (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
                        <Glyph size={15} weight="duotone" aria-hidden="true" />
                    </span>
                ) : null}
            </div>

            <p className={cn('stat-value tabular', tone === 'live' && 'text-live')}>{value}</p>

            {hint !== undefined ? <p className="meta leading-snug">{hint}</p> : null}
        </div>
    );

    if (href === undefined) {
        return tile;
    }

    return (
        <Link href={href} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            {tile}
        </Link>
    );
}
