import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    mode: ThemeMode;
    resolved: ResolvedTheme;
    setMode: (mode: ThemeMode) => void;
    cycle: () => void;
}

const STORAGE_KEY = 'cognita.theme';
const MODES: ThemeMode[] = ['system', 'light', 'dark'];

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isMode(value: string | null): value is ThemeMode {
    return value === 'system' || value === 'light' || value === 'dark';
}

function preferredTheme(): ResolvedTheme {
    if (typeof window === 'undefined') {
        return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedMode(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'system';
    }

    const value = window.localStorage.getItem(STORAGE_KEY);

    return isMode(value) ? value : 'system';
}

function applyTheme(theme: ResolvedTheme): void {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;

    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f1411' : '#f3efe6');
}

/**
 * The app follows the operating system until someone makes a deliberate
 * choice. The live call reads the same class on `<html>`, so it is never dark
 * unless the rest of the product is dark too.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(storedMode);
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(preferredTheme);

    const resolved = mode === 'system' ? systemTheme : mode;

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');

        function onChange(): void {
            setSystemTheme(media.matches ? 'dark' : 'light');
        }

        onChange();
        media.addEventListener('change', onChange);

        return () => media.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        applyTheme(resolved);
    }, [resolved]);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);

        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Private browsing can deny storage; the choice still applies for this visit.
        }
    }, []);

    const cycle = useCallback(() => {
        const index = MODES.indexOf(mode);
        setMode(MODES[(index + 1) % MODES.length]);
    }, [mode, setMode]);

    const value = useMemo<ThemeContextValue>(() => ({ mode, resolved, setMode, cycle }), [mode, resolved, setMode, cycle]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (context === null) {
        throw new Error('useTheme must be used inside ThemeProvider');
    }

    return context;
}
