/**
 * The pill that says a room is open right now.
 *
 * Five pages showed it; they all wanted the same green dot.
 */
export default function LiveChip({ label = 'Live' }: { label?: string }) {
    return (
        <span className="chip chip-live shrink-0">
            <span className="live-dot" aria-hidden="true" />
            {label}
        </span>
    );
}
