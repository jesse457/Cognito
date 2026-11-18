import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { useEffect } from 'react';
import type { PostMedia } from '@/types';

export default function Lightbox({
    images,
    index,
    onIndexChange,
    onClose,
}: {
    images: PostMedia[];
    index: number | null;
    onIndexChange: (index: number) => void;
    onClose: () => void;
}) {
    const open = index !== null && images.length > 0;

    useEffect(() => {
        if (! open) {
            return;
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onClose();
            } else if (event.key === 'ArrowLeft' && index !== null) {
                onIndexChange((index - 1 + images.length) % images.length);
            } else if (event.key === 'ArrowRight' && index !== null) {
                onIndexChange((index + 1) % images.length);
            }
        }

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [images.length, index, onClose, onIndexChange, open]);

    if (! open || index === null) {
        return null;
    }

    const image = images[index];

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col bg-stage/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={image.name}
        >
            <div className="flex items-center justify-between px-4 py-3 text-stage-ink">
                <p className="truncate text-[13px] font-medium">{image.name}</p>
                <div className="flex items-center gap-2">
                    <span className="text-[12px] tabular text-stage-ink/60">
                        {index + 1} / {images.length}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close image"
                        className="rounded-lg p-2 text-stage-ink hover:bg-stage-ink/10"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center gap-3 px-3 pb-4">
                {images.length > 1 ? (
                    <button
                        type="button"
                        onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
                        aria-label="Previous image"
                        className="rounded-full bg-stage-ink/10 p-2 text-stage-ink hover:bg-stage-ink/20"
                    >
                        <CaretLeft size={22} aria-hidden="true" />
                    </button>
                ) : null}

                <img src={image.url} alt={image.name} className="max-h-full max-w-full object-contain" />

                {images.length > 1 ? (
                    <button
                        type="button"
                        onClick={() => onIndexChange((index + 1) % images.length)}
                        aria-label="Next image"
                        className="rounded-full bg-stage-ink/10 p-2 text-stage-ink hover:bg-stage-ink/20"
                    >
                        <CaretRight size={22} aria-hidden="true" />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
