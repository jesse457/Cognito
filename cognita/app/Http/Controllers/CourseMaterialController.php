<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CourseMaterial;
use App\Support\MediaDisk;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class CourseMaterialController extends Controller
{
    /**
     * Serve a lesson file with byte-range support and revalidation.
     *
     * Local files go through BinaryFileResponse, which answers Range requests
     * itself. Object storage gets a short-lived URL so the storage service
     * streams the bytes instead of proxying whole videos through PHP.
     */
    public function show(
        Request $request,
        CourseMaterial $material,
    ): BinaryFileResponse|StreamedResponse|RedirectResponse|Response {
        $this->authorize('view', $material);

        $diskName = $material->mediaDisk();
        $disk = MediaDisk::of($diskName);

        abort_unless($disk->exists($material->path), 404);

        $mime = $material->mime_type ?: 'application/octet-stream';
        $disposition = $request->boolean('download') ? 'attachment' : 'inline';
        $filename = str_replace(['"', '\\', "\r", "\n"], '_', $material->title);
        $cacheControl = 'private, max-age=0, must-revalidate';

        $headers = [
            'Content-Type' => $mime,
            'Cache-Control' => $cacheControl,
            'X-Content-Type-Options' => 'nosniff',
        ];

        $isLocal = (config("filesystems.disks.{$diskName}.driver") ?? null) === 'local';

        if (! $isLocal && $disk->providesTemporaryUrls()) {
            try {
                return redirect()->away($disk->temporaryUrl($material->path, now()->addHours(6), [
                    'ResponseContentType' => $mime,
                    'ResponseCacheControl' => $cacheControl,
                    'ResponseContentDisposition' => "{$disposition}; filename=\"{$filename}\"",
                ]), 302, ['Cache-Control' => 'private, no-store']);
            } catch (Throwable) {
                // Fall through to a streamed response if pre-signing fails.
            }
        }

        if ($isLocal) {
            $path = $disk->path($material->path);
            $response = response()->file($path, $headers);
            $response->setPrivate();
            $response->setLastModified($material->updated_at);
            $response->setEtag(
                (string) ((int) $material->getKey().'-'.(@filemtime($path) ?: 0).'-'.(@filesize($path) ?: 0)),
            );
            $response->isNotModified($request);

            return $response;
        }

        return $disk->response($material->path, $material->title, $headers);
    }
}
