import { Desktop, Moon, Sun } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/hooks/useTheme';

const ICONS: Record<ThemeMode, Icon> = {
    system: Desktop,
    light: Sun,
    dark: Moon,
};

const LABELS: Record<ThemeMode, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
};

/**
 * A three-state switch, not a binary one: System is the default and keeps the
 * product in step with the device. Clicking cycles System → Light → Dark.
 */
export default function ThemeToggle({
    className,
    showLabel = false,
}: {
    className?: string;
    showLabel?: boolean;
}) {
    const { mode, cycle, resolved } = useTheme();
    const Glyph = ICONS[mode];
    const next = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';

    return (
        <button
            type="button"
            onClick={cycle}
            className={cn(
                'btn btn-quiet btn-sm',
                showLabel ? 'w-full justify-start gap-2.5 px-2.5' : 'btn-icon',
                className,
            )}
            title={`Appearance: ${LABELS[mode]} (${resolved}). Switch to ${LABELS[next]}.`}
            aria-label={`Appearance: ${LABELS[mode]}. Switch to ${LABELS[next]}.`}
        >
            <Glyph size={showLabel ? 17 : 18} weight={mode === 'dark' ? 'fill' : 'regular'} aria-hidden="true" />
            {showLabel ? (
                <>
                    <span className="text-[12px] font-medium">Appearance</span>
                    <span className="ml-auto text-[11px] text-ink-soft">{LABELS[mode]}</span>
                </>
            ) : null}
        </button>
    );
}
