import { MagnifyingGlass } from '@phosphor-icons/react';

/**
 * A search field with a magnifier in it.
 *
 * Six pages had this block written out longhand; they all wanted the same
 * thing, so it lives here now.
 */
export default function SearchInput({
    value,
    onChange,
    label,
    placeholder,
    ariaLabel,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    /** An optional field label above the input. */
    label?: string;
    placeholder?: string;
    ariaLabel?: string;
    className?: string;
}) {
    return (
        <label className={className}>
            {label ? <span className="label">{label}</span> : null}
            <span className="relative block">
                <MagnifyingGlass
                    size={16}
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft"
                    aria-hidden="true"
                />
                <input
                    type="search"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="input pl-10"
                    placeholder={placeholder}
                    aria-label={ariaLabel ?? label ?? placeholder}
                />
            </span>
        </label>
    );
}
