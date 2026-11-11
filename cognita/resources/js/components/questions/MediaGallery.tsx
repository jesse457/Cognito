import { cn } from '@/lib/utils';
import type { PostMedia } from '@/types';

export default function MediaGallery({ media, className }: { media: PostMedia[]; className?: string }) {
    if (media.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'mt-4 grid gap-2',
                media.length === 1 ? 'max-w-2xl' : 'sm:grid-cols-2',
                className,
            )}
        >
            {media.map((item) => (
                <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    title={item.name}
                    className={cn(
                        'block overflow-hidden rounded-xl border border-line bg-surface-sunken transition hover:border-line-strong',
                        media.length > 1 && 'aspect-[4/3]',
                    )}
                >
                    <img
                        src={item.url}
                        alt={item.name}
                        loading="lazy"
                        className={cn(
                            'w-full',
                            media.length === 1 ? 'max-h-[420px] object-contain' : 'h-full object-cover',
                        )}
                    />
                </a>
            ))}
        </div>
    );
}
