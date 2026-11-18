import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import SearchInput from '@/components/ui/SearchInput';

export interface InventoryColumn<T> {
    header: string;
    cell: (row: T) => ReactNode;
    /** Numbers are set in tabular figures and read as data. */
    numeric?: boolean;
}

/**
 * The administrator's inventory: a read-only table of what exists.
 *
 * Courses and classes are the same shape — a name, who owns it, how much of it
 * there is and when it appeared — so they share one table.
 */
export default function InventoryTable<T extends { id: number }>({
    title,
    subtitle,
    count,
    rows,
    columns,
    emptyTitle,
    emptyBody,
    searchText,
}: {
    title: string;
    subtitle: string;
    /** The count in the card header, already pluralised. */
    count: string;
    rows: T[];
    columns: InventoryColumn<T>[];
    emptyTitle: string;
    emptyBody: string;
    /** The text one row is searched by. Without it the table is not filtered. */
    searchText?: (row: T) => string;
}) {
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        if (needle === '' || searchText === undefined) {
            return rows;
        }

        return rows.filter((row) => searchText(row).toLowerCase().includes(needle));
    }, [query, rows, searchText]);

    const filtering = query.trim() !== '';

    return (
        <>
            <header>
                <h1 className="page-title">{title}</h1>
                <p className="page-sub">{subtitle}</p>
            </header>

            <div className="card">
                <div className="card-head">
                    <h2 className="section-title">All {title.toLowerCase()}</h2>
                    <span className="chip chip-neutral">
                        {filtering ? `${visible.length} of ${rows.length}` : count}
                    </span>
                </div>

                {searchText !== undefined ? (
                    <div className="border-b border-line px-4 py-3">
                        <SearchInput
                            className="sm:w-72"
                            value={query}
                            onChange={setQuery}
                            placeholder={`Search ${title.toLowerCase()}`}
                            ariaLabel={`Search ${title.toLowerCase()}`}
                        />
                    </div>
                ) : null}

                {visible.length === 0 ? (
                    <EmptyState
                        title={filtering ? 'Nothing matches that search' : emptyTitle}
                        body={filtering ? 'Try another word, or clear the search box.' : emptyBody}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    {columns.map((column) => (
                                        <th key={column.header} className="th">
                                            {column.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((row) => (
                                    <tr key={row.id} className="row-hover">
                                        {columns.map((column) => (
                                            <td
                                                key={column.header}
                                                className={column.numeric ? 'td tabular' : 'td'}
                                            >
                                                {column.cell(row)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
