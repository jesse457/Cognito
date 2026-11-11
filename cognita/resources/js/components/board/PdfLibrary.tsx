import { CaretDown, Check, FilePdf, UploadSimple } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { cn, formatBytes } from '@/lib/utils';
import type { BoardDocumentSummary, BoardSurface } from '@/types';

/** The PDFs that already belong to this class, plus an upload door. */
export default function PdfLibrary({
    open,
    onOpenChange,
    documents,
    uploading,
    surface,
    onSelect,
    onUpload,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documents: BoardDocumentSummary[];
    uploading: boolean;
    surface: BoardSurface;
    onSelect: (document: BoardDocumentSummary) => void;
    onUpload: () => void;
}) {
    const wrap = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onPointerDown(event: PointerEvent): void {
            if (!wrap.current?.contains(event.target as Node)) {
                onOpenChange(false);
            }
        }

        function onKeyDown(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onOpenChange(false);
            }
        }

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onOpenChange]);

    return (
        <div ref={wrap} className="relative">
            <button
                type="button"
                className="call-control h-9 min-w-9 px-2.5 text-[12px]"
                onClick={() => onOpenChange(!open)}
                disabled={uploading}
                aria-expanded={open}
                aria-haspopup="menu"
                title="Choose a PDF already attached to this class"
            >
                <FilePdf size={15} aria-hidden="true" />
                <span className="hidden sm:inline">
                    {uploading ? 'Opening…' : documents.length > 0 ? 'Class PDFs' : 'Upload PDF'}
                </span>
                {documents.length > 0 ? <CaretDown size={11} aria-hidden="true" /> : null}
            </button>

            {open ? (
                <div role="menu" aria-label="PDFs attached to this class" className="pdf-library">
                    <p className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-stage-ink/40 uppercase">
                        Class PDFs
                    </p>

                    <div className="max-h-64 overflow-y-auto overscroll-contain">
                        {documents.map((document) => (
                            <button
                                key={document.id}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onSelect(document);
                                    onOpenChange(false);
                                }}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-[12px] transition',
                                    document.active && surface === 'pdf'
                                        ? 'bg-stage-ink/10 text-stage-ink'
                                        : 'text-stage-ink/75 hover:bg-stage-ink/10 hover:text-stage-ink',
                                )}
                            >
                                <FilePdf size={17} className="shrink-0 text-stage-danger" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium">{document.name}</span>
                                    <span className="block text-[10px] text-stage-ink/40">
                                        {document.pages} {document.pages === 1 ? 'page' : 'pages'}
                                        {document.size > 0 ? ` · ${formatBytes(document.size)}` : ''}
                                    </span>
                                </span>
                                {document.active && surface === 'pdf' ? (
                                    <Check size={14} className="shrink-0 text-stage-live" aria-hidden="true" />
                                ) : null}
                            </button>
                        ))}
                    </div>

                    <div className="mt-1 border-t border-stage-line pt-1">
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                onUpload();
                                onOpenChange(false);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-[12px] font-medium text-stage-ink/75 transition hover:bg-stage-ink/10 hover:text-stage-ink"
                        >
                            <UploadSimple size={16} aria-hidden="true" />
                            Upload a new PDF
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
