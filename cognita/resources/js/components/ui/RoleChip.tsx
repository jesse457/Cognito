import { cn } from '@/lib/utils';

/** The chip that says what an account is. */
export default function RoleChip({ role }: { role: string }) {
    const label = role === 'admin' ? 'Admin' : role === 'instructor' ? 'Instructor' : 'Student';

    return (
        <span
            className={cn(
                'chip',
                role === 'admin' ? 'chip-brand' : role === 'instructor' ? 'chip-live' : 'chip-neutral',
            )}
        >
            {label}
        </span>
    );
}
