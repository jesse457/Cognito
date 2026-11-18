import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/** Copy text to the clipboard, falling back to a hidden textarea on old browsers. */
export async function copyText(value: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(value);

        return true;
    } catch {
        try {
            const area = document.createElement('textarea');
            area.value = value;
            area.setAttribute('readonly', '');
            area.style.position = 'absolute';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(area);

            return ok;
        } catch {
            return false;
        }
    }
}

/**
 * "3 members" / "1 member", with the plural worked out.
 *
 * Most call sites used to spell the plural out ("class", "classes"); the rules
 * below cover the words the product actually uses, and an explicit plural is
 * still accepted for the irregular ones.
 */
export function pluralize(count: number, singular: string, plural?: string): string {
    return `${count} ${count === 1 ? singular : (plural ?? pluralOf(singular))}`;
}

/** The English plural of a noun: class → classes, match → matches, day → days. */
function pluralOf(singular: string): string {
    if (/(s|x|z|ch|sh)$/.test(singular)) {
        return `${singular}es`;
    }

    if (/[^aeiou]y$/.test(singular)) {
        return `${singular.slice(0, -1)}ies`;
    }

    return `${singular}s`;
}

/** Round a byte count to the unit a person reading a file list expects. */
export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / 1024 ** exponent;

    return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

/** An ISO string as a Date, or null when it is not one. */
function parseInstant(iso: string | null): Date | null {
    if (iso === null) {
        return null;
    }

    const at = new Date(iso);

    return Number.isNaN(at.getTime()) ? null : at;
}

/** "Today · 15:00", "Tomorrow · 09:00", "Mon 3 Nov · 10:30" for a moment in time. */
export function formatMoment(iso: string | null): string | null {
    const at = parseInstant(iso);

    if (at === null) {
        return null;
    }

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sameDay = (left: Date, right: Date): boolean =>
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate();

    if (sameDay(at, today)) {
        return `Today · ${time}`;
    }

    if (sameDay(at, tomorrow)) {
        return `Tomorrow · ${time}`;
    }

    return `${at.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} · ${time}`;
}

/** How far away a moment still is: "in 25 min", "in 3 h", "Tomorrow". */
export function formatUntil(iso: string | null): string | null {
    const at = parseInstant(iso);

    if (at === null) {
        return null;
    }

    const minutes = Math.round((at.getTime() - Date.now()) / 60000);

    if (minutes <= 0) {
        return null;
    }

    if (minutes < 60) {
        return `in ${minutes} min`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
        return `in ${hours} h`;
    }

    const days = Math.round(hours / 24);

    return days === 1 ? 'tomorrow' : `in ${days} days`;
}

export function initialsOf(name: string): string {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('') || '?'
    );
}
