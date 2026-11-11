let current: string | null = null;

/**
 * A stable, opaque id for this page.
 *
 * It is appended to the participant identity so two tabs of the same account are
 * two participants instead of a fight over one seat. Deliberately *not* stored
 * in sessionStorage: browsers copy that storage when a tab is duplicated, which
 * would give both tabs the same identity and make LiveKit kick one of them out
 * with a duplicate-identity error.
 */
export function tabSession(): string {
    current ??= create();

    return current;
}

function create(): string {
    const random = Math.random().toString(36).slice(2, 11).padEnd(6, '0');

    return random.slice(0, 12);
}
