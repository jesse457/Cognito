import { ImageSquare, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp';

function isSupported(file: File): boolean {
    if (file.type === '') {
        return /\.(jpe?g|png|gif|webp)$/i.test(file.name);
    }

    return /^image\/(jpeg|png|gif|webp)$/i.test(file.type);
}

export default function MediaPicker({
    files,
    onChange,
    error,
    disabled = false,
    max = 5,
}: {
    files: File[];
    onChange: (files: File[]) => void;
    error?: string | null;
    disabled?: boolean;
    max?: number;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
    const [localError, setLocalError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const shownError = error ?? localError;

    useEffect(() => {
        const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
        setPreviews(next);

        return () => next.forEach((item) => URL.revokeObjectURL(item.url));
    }, [files]);

    function add(selected: FileList | null): void {
        if (selected === null || disabled) {
            return;
        }

        const next = [...files];
        let issue: string | null = null;

        for (const file of Array.from(selected)) {
            if (next.length >= max) {
                issue = `You can attach up to ${max} photos.`;
                break;
            }

            if (!isSupported(file)) {
                issue = 'Photos must be JPG, PNG, GIF or WebP images.';

                continue;
            }

            if (file.size > MAX_BYTES) {
                issue = 'Each photo must be 10 MB or smaller.';

                continue;
            }

            const duplicate = next.some(
                (item) =>
                    item.name === file.name &&
                    item.size === file.size &&
                    item.lastModified === file.lastModified,
            );

            if (!duplicate) {
                next.push(file);
            }
        }

        setLocalError(issue);
        onChange(next);

        if (inputRef.current !== null) {
            inputRef.current.value = '';
        }
    }

    function remove(index: number): void {
        setLocalError(null);
        onChange(files.filter((_, position) => position !== index));
    }

    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {previews.map(({ file, url }, index) => (
                    <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="group relative h-20 w-20 overflow-hidden rounded-lg border border-line bg-surface-sunken"
                    >
                        <img src={url} alt={file.name} className="h-full w-full object-cover" />
                        <button
                            type="button"
                            onClick={() => remove(index)}
                            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                            aria-label={`Remove ${file.name}`}
                        >
                            <X size={12} weight="bold" aria-hidden="true" />
                        </button>
                    </div>
                ))}

                {files.length < max ? (
                    <label
                        onDragOver={(event) => {
                            event.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(event) => {
                            event.preventDefault();
                            setDragging(false);
                            add(event.dataTransfer.files);
                        }}
                        className={cn(
                            'flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong bg-surface text-ink-soft transition hover:border-brand hover:text-brand',
                            dragging && 'border-brand bg-brand-soft text-brand',
                            disabled && 'pointer-events-none opacity-50',
                        )}
                    >
                        <ImageSquare size={20} aria-hidden="true" />
                        <span className="text-[10px] font-medium">Add photo</span>
                        <input
                            ref={inputRef}
                            type="file"
                            accept={ACCEPTED}
                            multiple
                            disabled={disabled}
                            className="sr-only"
                            onChange={(event) => add(event.target.files)}
                        />
                    </label>
                ) : null}
            </div>

            <p className="hint">
                Up to {max} photos · JPG, PNG, GIF or WebP · 10 MB each. Drag and drop works too.
            </p>

            {shownError ? (
                <p className="error" role="alert">
                    {shownError}
                </p>
            ) : null}
        </div>
    );
}
