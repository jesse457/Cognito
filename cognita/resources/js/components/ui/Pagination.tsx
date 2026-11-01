import { Link } from '@inertiajs/react';
import type { Paginated } from '@/types';
import { cn, paginationLabel } from '@/lib/utils';

interface PaginationProps {
    page: Paginated<unknown>;
    className?: string;
}

/**
 * Server-driven pagination. Laravel renders the window of page links; labels are
 * normalised so "&laquo; Previous" becomes "Previous".
 */
export default function Pagination({ page, className }: PaginationProps) {
    if (page.last_page <= 1) {
        return null;
    }

    return (
        <nav className={cn('flex flex-wrap items-center justify-between gap-3', className)} aria-label="Pagination">
            <p className="meta tabular-nums">
                Showing {page.from ?? 0} to {page.to ?? 0} of {page.total}
            </p>
            <ul className="flex flex-wrap items-center gap-1">
                {page.links.map((link, index) => (
                    <li key={`${link.label}-${index}`}>
                        {link.url ? (
                            <Link
                                href={link.url}
                                preserveScroll
                                className={cn(
                                    'inline-flex min-w-8 items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                                    link.active
                                        ? 'border-teal-700 bg-teal-700 text-white'
                                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
                                )}
                                aria-current={link.active ? 'page' : undefined}
                            >
                                {paginationLabel(link.label)}
                            </Link>
                        ) : (
                            <span className="inline-flex min-w-8 items-center justify-center rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-400">
                                {paginationLabel(link.label)}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
}
