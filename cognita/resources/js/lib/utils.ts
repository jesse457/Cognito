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

/** "3 members" / "1 member" without an awkward zero. */
export function pluralize(count: number, singular: string, plural?: string): string {
    return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
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
