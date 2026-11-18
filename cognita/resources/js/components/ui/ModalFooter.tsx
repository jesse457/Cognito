import type { ReactNode } from 'react';
import Button from '@/components/ui/Button';

/**
 * The bottom of a form in a modal: cancel on the left of the pair, the action
 * on the right, separated from the body by a rule.
 */
export default function ModalFooter({
    onCancel,
    submitLabel,
    busyLabel,
    busy = false,
    icon,
}: {
    onCancel: () => void;
    submitLabel: string;
    /** What the button says while the form is sending. */
    busyLabel?: string;
    busy?: boolean;
    icon?: ReactNode;
}) {
    return (
        <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="quiet" onClick={onCancel}>
                Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
                {busy && busyLabel ? busyLabel : submitLabel}
                {icon}
            </Button>
        </div>
    );
}
