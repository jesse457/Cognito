import type { BoardStroke } from '@/types';

/**
 * Which strokes are mine, and who drew everyone else's.
 *
 * Undo is a personal action: it may only remove a stroke the caller drew, and a
 * stroke may only be undone by its author (or by the host). Keeping the ids and
 * their owners in one small object is what stops that rule from being re-derived
 * in three places.
 */
export class StrokeLedger {
    private own: number[] = [];
    private owners = new Map<number, string>();

    constructor(private readonly limit = 60) {}

    /** Remember a stroke this client just drew. */
    remember(id: number, owner: string | null): void {
        this.own.push(id);

        if (this.own.length > this.limit) {
            this.own = this.own.slice(-this.limit);
        }

        if (owner !== null) {
            this.owners.set(id, owner);
        }
    }

    forget(id: number): void {
        this.own = this.own.filter((value) => value !== id);
    }

    /** Remember who drew a stroke that arrived from the room. */
    attribute(id: number, owner: string | null): void {
        if (owner !== null) {
            this.owners.set(id, owner);
        }
    }

    /** The newest stroke of mine that is still on the board, if any. */
    latestOn(strokes: BoardStroke[]): number | null {
        const present = new Set(strokes.map((stroke) => stroke.id));

        for (let index = this.own.length - 1; index >= 0; index -= 1) {
            if (present.has(this.own[index])) {
                return this.own[index];
            }
        }

        return null;
    }

    hasAnythingOn(strokes: BoardStroke[]): boolean {
        return this.latestOn(strokes) !== null;
    }

    ownerOf(id: number): string | null {
        return this.owners.get(id) ?? null;
    }

    reset(): void {
        this.own = [];
        this.owners.clear();
    }
}
