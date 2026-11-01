import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';

/**
 * One-shot server flashes (session success/error). Inertia keeps them for a
 * single visit, so no client-side dismissal timer is needed.
 */
export default function Flash() {
    const { flash } = usePage<SharedProps>().props;

    if (!flash?.success && !flash?.error) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            {flash.success ? (
                <div className="flash flash-success" role="status">
                    <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                    <p>{flash.success}</p>
                </div>
            ) : null}
            {flash.error ? (
                <div className="flash flash-error" role="alert">
                    <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
                    <p>{flash.error}</p>
                </div>
            ) : null}
        </div>
    );
}
