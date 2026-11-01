import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Dense console table. Cells own their borders so partial rows still read as a
 * table, and the wrapper adds horizontal scroll on narrow screens.
 */
export function TableWrapper({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="table">{children}</table>
        </div>
    );
}

export function Th({ children, className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th scope="col" className={cn('th', className)} {...props}>
            {children}
        </th>
    );
}

export function Td({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td className={cn('td', className)} {...props}>
            {children}
        </td>
    );
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
    return <tr className={cn('tr-hover', className)}>{children}</tr>;
}
