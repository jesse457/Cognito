import { DownloadSimple } from '@phosphor-icons/react';
import Modal from '@/components/ui/Modal';
import type { CourseMaterialView } from '@/types';

export default function DocumentViewer({
    material,
    onClose,
}: {
    material: CourseMaterialView | null;
    onClose: () => void;
}) {
    const kind = material?.kind;
    const canPreview = kind === 'pdf' || kind === 'image';

    return (
        <Modal
            open={material !== null}
            title={material?.title ?? ''}
            description={material ? `${material.size_label} · ${kind === 'pdf' ? 'PDF document' : kind === 'image' ? 'Image' : 'Lesson file'}` : undefined}
            onClose={onClose}
        >
            {material === null ? null : canPreview ? (
                <div className="overflow-hidden rounded-lg border border-line bg-surface-sunken">
                    {kind === 'image' ? (
                        <img src={material.url} alt={material.title} className="max-h-[65vh] w-full object-contain" />
                    ) : (
                        <iframe
                            src={material.url}
                            title={material.title}
                            className="h-[65vh] w-full bg-white"
                        />
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <p className="text-[13px] text-ink-muted">
                        This file type cannot be previewed in the browser. Download it to open it with an app on your device.
                    </p>
                </div>
            )}

            <div className="mt-4 flex justify-end border-t border-line pt-3">
                <a href={material?.download_url ?? '#'} className="btn btn-outline btn-sm">
                    <DownloadSimple size={14} aria-hidden="true" />
                    Download
                </a>
            </div>
        </Modal>
    );
}
