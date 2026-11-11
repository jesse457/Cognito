import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const controlClass = 'input';

/** One labelled control block: label above, control, then hint or error below. */
export function Field({
    label,
    error,
    hint,
    children,
    htmlFor,
}: {
    label: string;
    error?: string | null;
    hint?: ReactNode;
    children: (id: string) => ReactNode;
    htmlFor?: string;
}) {
    const generated = useId();
    const id = htmlFor ?? generated;

    return (
        <div className="w-full">
            <label className="label" htmlFor={id}>
                {label}
            </label>
            {children(id)}
            {error ? (
                <p className="error" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="hint">{hint}</p>
            ) : null}
        </div>
    );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function TextInput({ invalid, className, ...props }: InputProps) {
    return <input {...props} className={cn(controlClass, invalid && 'border-danger focus:border-danger', className)} />;
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export function TextArea({ invalid, className, ...props }: TextareaProps) {
    return (
        <textarea
            {...props}
            className={cn(controlClass, 'min-h-24 resize-y', invalid && 'border-danger focus:border-danger', className)}
        />
    );
}
