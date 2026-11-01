import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/** Human date for dense tables: 12 Mar 2026, 14:05. */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Short date for roster-style cells. */
export function formatDate(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    const date = new Date(iso);

    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** 0.7345 -> "73%" */
export function percent(value: number | string | null | undefined): string {
    const numeric = Number(value ?? 0);

    return `${Math.round(Math.max(0, Math.min(1, numeric)) * 100)}%`;
}

/** Strip HTML entities Laravel ships inside pagination labels. */
export function paginationLabel(label: string): string {
    const text = label.replace(/&laquo;|&raquo;|&amp;/g, (entity) => {
        return { '&laquo;': '«', '&raquo;': '»', '&amp;': '&' }[entity] ?? entity;
    });

    if (text.toLowerCase().includes('previous')) {
        return 'Previous';
    }

    if (text.toLowerCase().includes('next')) {
        return 'Next';
    }

    return text;
}
