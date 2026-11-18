<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\BoardSurface;
use App\Http\Requests\UploadBoardDocumentRequest;
use App\Models\ClassBoard;
use App\Models\ClassDocument;
use App\Models\Classroom;
use App\Services\BoardSessions;
use App\Services\ClassMaterials;
use App\Support\MediaDisk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The PDFs an instructor can present on the class board.
 *
 * Every upload stays attached to the class, so a deck can go back on the board
 * later without uploading it again. The file itself is stored on the board disk
 * (S3/MinIO by default, see filesystems.media_disk); this controller keeps the
 * pointers, the checksum de-duplication and the streaming response.
 */
class BoardDocumentController extends Controller
{
    public function __construct(
        private readonly BoardSessions $sessions,
        private readonly ClassMaterials $materials,
    ) {}

    public function store(UploadBoardDocumentRequest $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        $this->authorize('manageBoard', $classroom);

        $board = $classroom->boardOrCreate();
        $file = $request->file('document');

        if ($file === null) {
            return back()->with('error', 'Choose a PDF to present.');
        }

        $document = $this->materials->storeIfNew($file, $classroom, $request->user());

        if ($document === null) {
            return back()->with('error', 'The PDF could not be stored. Try again.');
        }

        $board->presentDocument($document);

        return $this->respond($request, $classroom, $board, 'PDF is on the board. Everyone in the call sees page 1.');
    }

    /** Put a PDF that already belongs to this class back on the board. */
    public function present(Request $request, Classroom $classroom, ClassDocument $document): JsonResponse|RedirectResponse
    {
        $this->authorize('manageBoard', $classroom);
        abort_unless((int) $document->classroom_id === (int) $classroom->getKey(), 404);

        $board = $classroom->boardOrCreate();
        $sameDocument = (int) $board->document_id === (int) $document->getKey();

        $board->presentDocument($document, resetPage: ! $sameDocument);

        return $this->respond($request, $classroom, $board, 'The stored PDF is back on the board.');
    }

    /** Take the PDF off the board; the file stays in the class library. */
    public function destroy(Request $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        $this->authorize('manageBoard', $classroom);

        $board = $classroom->boardOrCreate();

        $board->forceFill([
            'document_id' => null,
            'surface' => BoardSurface::Canvas,
            'title' => BoardSurface::Canvas->label(),
            'page' => 1,
        ])->save();

        return $this->respond($request, $classroom, $board, 'PDF removed from the board. It stays in the class PDF library.');
    }

    /** The PDF currently on the board. */
    public function current(Request $request, Classroom $classroom): BinaryFileResponse|StreamedResponse|RedirectResponse
    {
        $this->authorize('viewMaterials', $classroom);

        $board = $classroom->board()->first();

        abort_if($board === null || ! $board->hasDocument(), 404);

        $document = ClassDocument::query()
            ->where('classroom_id', $classroom->getKey())
            ->find($board->document_id);

        abort_if($document === null, 404);

        // The alias changes when the instructor picks another PDF, so it must
        // revalidate instead of being cached as immutable.
        return $this->stream($request, $document, immutable: false);
    }

    /** A stored PDF, addressed by its own immutable URL. */
    public function show(Request $request, Classroom $classroom, ClassDocument $document): BinaryFileResponse|StreamedResponse|RedirectResponse
    {
        $this->authorize('viewMaterials', $classroom);
        abort_unless((int) $document->classroom_id === (int) $classroom->getKey(), 404);

        return $this->stream($request, $document, immutable: true);
    }

    private function respond(Request $request, Classroom $classroom, ClassBoard $board, string $message): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson()) {
            return response()->json([
                'data' => $board->refresh()->state($this->sessions->live($classroom)),
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Serve a stored PDF with an immutable per-document URL, ETag validation and
     * byte-range support. PDF.js then fetches only the chunks it needs, and a
     * repeat visit revalidates with a tiny 304 instead of downloading it again.
     */
    private function stream(Request $request, ClassDocument $document, bool $immutable): BinaryFileResponse|StreamedResponse|RedirectResponse
    {
        $diskName = $document->disk !== null && $document->disk !== ''
            ? $document->disk
            : $this->documentDisk();
        $disk = Storage::disk($diskName);

        abort_unless($disk->exists($document->path), 404);

        $isLocal = (config("filesystems.disks.{$diskName}.driver") ?? null) === 'local';
        $cacheControl = $immutable
            ? 'private, max-age=2592000, immutable'
            : 'private, max-age=0, must-revalidate';

        // Object storage already knows how to answer range requests, so hand
        // the browser a short-lived URL instead of proxying the whole file.
        if ($immutable && ! $isLocal && $disk->providesTemporaryUrls()) {
            try {
                return redirect()->away($disk->temporaryUrl($document->path, now()->addHours(6), [
                    'ResponseContentType' => 'application/pdf',
                    'ResponseCacheControl' => $cacheControl,
                    'ResponseContentDisposition' => 'inline; filename="'.$this->safeFilename($document->name).'"',
                ]), 302, ['Cache-Control' => 'private, no-store']);
            } catch (\Throwable) {
                // Fall through to a streamed response if pre-signing fails.
            }
        }

        if ($isLocal) {
            return $this->streamLocal($request, $disk->path($document->path), $document, $cacheControl, $immutable);
        }

        return $disk->response($document->path, $document->name, [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => $cacheControl,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function streamLocal(
        Request $request,
        string $path,
        ClassDocument $document,
        string $cacheControl,
        bool $immutable,
    ): BinaryFileResponse {
        $response = response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => $cacheControl,
            'X-Content-Type-Options' => 'nosniff',
        ]);

        $response->setPrivate();
        $response->setLastModified($document->updated_at);
        $response->setEtag($document->checksum ?: $this->fileEtag($path));

        if ($immutable) {
            $response->setMaxAge(2592000);
            $response->setImmutable();
        } else {
            $response->setMaxAge(0);
            $response->headers->addCacheControlDirective('must-revalidate');
        }

        // This turns the response into a 304 in place when the browser already
        // holds that ETag, so it has to run before the response is returned.
        $response->isNotModified($request);

        return $response;
    }

    private function documentDisk(): string
    {
        return MediaDisk::name();
    }

    private function safeFilename(string $name): string
    {
        return str_replace(['"', '\\', "\r", "\n"], '_', $name);
    }

    private function fileEtag(string $path): string
    {
        return (@filemtime($path) ?: 0).'-'.(@filesize($path) ?: 0);
    }
}
