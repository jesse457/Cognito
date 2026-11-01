import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    children: ReactNode;
    className?: string;
}

export function Card({ children, className }: CardProps) {
    return <section className={cn('card', className)}>{children}</section>;
}

interface CardHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
    return (
        <header className={cn('card-header', className)}>
            <div>
                <h2 className="section-title">{title}</h2>
                {description ? <p className="meta mt-1 max-w-[65ch]">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    );
}

export function CardBody({ children, className }: CardProps) {
    return <div className={cn('card-body', className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardProps) {
    return <footer className={cn('card-footer', className)}>{children}</footer>;
}

export default Card;
