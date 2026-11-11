import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { canvasPixelRatio, isRenderCancellation } from './ink';

export interface PdfStage {
    /** width / height of the first page; null until the document opens. */
    ratio: number | null;
    loading: boolean;
    error: string | null;
    /** Paint one page of the document into a canvas at the given CSS width. */
    paint: (canvas: HTMLCanvasElement, page: number, cssWidth: number) => void;
}

/**
 * PDF.js, kept in one hook.
 *
 * Two behaviours matter and are easy to get wrong:
 *
 *   - only the page being shown is rendered, and the worker is told not to
 *     prefetch, so a student on a phone downloads the pages they look at;
 *   - a resize or a page flip starts a newer render while an older one is still
 *     painting, so the old one is cancelled explicitly. Without that, PDF.js
 *     rejects the new render and the board shows an error over a page that is
 *     loading perfectly well.
 */
export function usePdfPage(url: string | null, onPageCount: (pages: number) => void): PdfStage {
    const document = useRef<PDFDocumentProxy | null>(null);
    const loadedUrl = useRef<string | null>(null);
    const renderTask = useRef<RenderTask | null>(null);

    const reportPages = useRef(onPageCount);
    reportPages.current = onPageCount;

    const [ratio, setRatio] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (url === null) {
            setLoading(false);
            setError(null);
            setRatio(null);

            return;
        }

        let cancelled = false;
        const cached = document.current;

        if (cached !== null && loadedUrl.current === url) {
            void cached
                .getPage(1)
                .then((firstPage) => {
                    if (cancelled) {
                        return;
                    }

                    const viewport = firstPage.getViewport({ scale: 1 });
                    setRatio(viewport.width / viewport.height);
                    reportPages.current(cached.numPages);
                })
                .catch(() => undefined);

            return () => {
                cancelled = true;
            };
        }

        // Drop the previous proxy now: a failed load must never paint the old
        // PDF under the new URL.
        const previous = document.current;
        document.current = null;
        loadedUrl.current = null;

        if (previous !== null) {
            void previous.destroy();
        }

        let loadingTask: PDFDocumentLoadingTask | null = null;
        let completed = false;

        setLoading(true);
        setError(null);
        setRatio(null);

        void (async () => {
            try {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = (
                    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
                ).default;

                loadingTask = pdfjs.getDocument({
                    url,
                    disableAutoFetch: true,
                    disableStream: false,
                    rangeChunkSize: 65_536,
                });

                const opened = await loadingTask.promise;

                if (cancelled) {
                    void loadingTask.destroy();

                    return;
                }

                const firstPage = await opened.getPage(1);
                const viewport = firstPage.getViewport({ scale: 1 });

                document.current = opened;
                loadedUrl.current = url;
                completed = true;
                setRatio(viewport.width / viewport.height);
                reportPages.current(opened.numPages);
            } catch {
                if (!cancelled) {
                    setError('This PDF could not be loaded. Check the connection and try again.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;

            // Abort a download still in flight: the browser should not keep
            // pulling bytes for a document nobody is looking at.
            if (!completed) {
                void loadingTask?.destroy();
            }
        };
    }, [url]);

    // Release the document and any in-flight render when the board closes.
    useEffect(() => {
        return () => {
            renderTask.current?.cancel();
            renderTask.current = null;

            const current = document.current;
            document.current = null;
            loadedUrl.current = null;

            if (current !== null) {
                void current.destroy();
            }
        };
    }, []);

    const paint = useCallback((canvas: HTMLCanvasElement, page: number, cssWidth: number): void => {
        const opened = document.current;
        const context = canvas.getContext('2d');

        if (opened === null || context === null || cssWidth <= 0) {
            return;
        }

        const pixelRatio = canvasPixelRatio();

        renderTask.current?.cancel();
        renderTask.current = null;
        setError(null);

        void (async () => {
            let current: RenderTask | null = null;

            try {
                const index = Math.min(Math.max(1, page), opened.numPages);
                const pdfPage = await opened.getPage(index);
                const base = pdfPage.getViewport({ scale: 1 });
                const viewport = pdfPage.getViewport({ scale: (cssWidth * pixelRatio) / base.width });

                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);

                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);

                current = pdfPage.render({ canvasContext: context, viewport });
                renderTask.current = current;
                await current.promise;
            } catch (caught) {
                if (!isRenderCancellation(caught)) {
                    setError('This page could not be rendered.');
                }
            } finally {
                if (renderTask.current === current) {
                    renderTask.current = null;
                }
            }
        })();
    }, []);

    return { ratio, loading, error, paint };
}
