import { Link } from '@inertiajs/react';
import type { Paginated } from '@/types';

export default function Pagination({ paginator }: { paginator: Paginated<unknown> }) {
    if (paginator.last_page <= 1) {
        return null;
    }

    const links = paginator.links.filter((link) => !link.label.includes('&laquo;') && !link.label.includes('&raquo;'));

    return (
        <nav className="flex flex-wrap items-center gap-1.5 px-5 py-3" aria-label="Pagination">
            {links.map((link) =>
                link.url === null ? (
                    <span key={link.label} className="rounded-full px-3 py-1.5 text-sm text-ink-soft">
                        {link.label}
                    </span>
                ) : (
                    <Link
                        key={link.label}
                        href={link.url}
                        preserveScroll
                        className={link.active ? 'btn btn-tonal btn-sm' : 'btn btn-quiet btn-sm'}
                        aria-current={link.active ? 'page' : undefined}
                    >
                        {link.label}
                    </Link>
                ),
            )}
            <span className="ml-auto text-xs text-ink-muted tabular">
                {paginator.from ?? 0}–{paginator.to ?? 0} of {paginator.total}
            </span>
        </nav>
    );
}
