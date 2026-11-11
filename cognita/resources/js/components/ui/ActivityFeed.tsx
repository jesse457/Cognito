import { Link } from '@inertiajs/react';
import { ArrowRight, Key, Microphone } from '@phosphor-icons/react';
import type { ActivityEntry } from '@/types';

/**
 * What happened lately, newest first.
 *
 * Every line is a fact the server recorded on its own — somebody joined a call,
 * somebody accepted a key — and every line is a link to the page that shows the
 * detail. The feed is deliberately short: it orients, it does not report.
 */
export default function ActivityFeed({ items }: { items: ActivityEntry[] }) {
    return (
        <ul className="divide-y divide-line">
            {items.map((item) => (
                <li key={item.id}>
                    <Link
                        href={item.href}
                        className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken/60"
                    >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
                            {item.kind === 'call' ? (
                                <Microphone size={15} weight="duotone" aria-hidden="true" />
                            ) : (
                                <Key size={15} weight="duotone" aria-hidden="true" />
                            )}
                        </span>

                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                            <span className="block truncate text-xs text-ink-muted">{item.meta}</span>
                        </span>

                        <span className="shrink-0 text-right">
                            <span className="block text-[11px] whitespace-nowrap text-ink-soft tabular">{item.at}</span>
                        </span>

                        <ArrowRight
                            size={14}
                            weight="bold"
                            aria-hidden="true"
                            className="shrink-0 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100"
                        />
                    </Link>
                </li>
            ))}
        </ul>
    );
}
