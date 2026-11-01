import { Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';
import { copyText } from '@/lib/utils';

/**
 * The class key as an object: monospace, spaced out, and one click to copy.
 * Instructors read it aloud, students type it, so it gets its own control.
 */
export default function KeyChip({ code, compact = false }: { code: string; compact?: boolean }) {
    const [copied, setCopied] = useState(false);

    async function copy(): Promise<void> {
        const ok = await copyText(code);

        if (!ok) {
            return;
        }

        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    }

    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={compact ? 'key-chip py-1 text-[13px]' : 'key-chip'}>{code}</span>
            <button
                type="button"
                onClick={() => void copy()}
                className="btn btn-quiet btn-icon btn-sm text-ink-muted"
                aria-label={copied ? 'Class key copied' : `Copy class key ${code}`}
                title="Copy class key"
            >
                {copied ? <Check size={16} weight="bold" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
        </span>
    );
}
