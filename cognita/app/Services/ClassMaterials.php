<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ClassDocument;
use App\Models\Classroom;
use App\Models\User;
use App\Support\MediaDisk;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * The PDF library every class keeps.
 *
 * Uploads are de-duplicated by checksum and stored on the media disk, whether
 * the instructor is putting the file on the board or attaching it to a session
 * for students to download ahead of time.
 */
final class ClassMaterials
{
    /** Re-use stored bytes when the same file was uploaded to this class. */
    public function storeIfNew(UploadedFile $file, Classroom $classroom, ?User $uploader): ?ClassDocument
    {
        return $this->findByChecksum($file, $classroom) ?? $this->store($file, $classroom, $uploader);
    }

    public function store(UploadedFile $file, Classroom $classroom, ?User $uploader): ?ClassDocument
    {
        $path = $file->storeAs(
            'boards/'.$classroom->getKey(),
            'document-'.Str::uuid().'.pdf',
            [
                'disk' => MediaDisk::name(),
                'ContentType' => 'application/pdf',
                'CacheControl' => 'private, max-age=2592000, immutable',
            ],
        );

        if ($path === false) {
            return null;
        }

        return $classroom->documents()->create([
            'uploaded_by' => $uploader?->getKey(),
            'name' => $this->documentName($file),
            'path' => $path,
            'disk' => MediaDisk::name(),
            'pages' => 1,
            'size' => max(0, (int) $file->getSize()),
            'checksum' => $this->fileChecksum($file),
        ]);
    }

    public function delete(ClassDocument $document): void
    {
        MediaDisk::of($document->disk)->delete($document->path);

        $document->delete();
    }

    /** Find an identical file already stored for this class, if it still exists. */
    public function findByChecksum(UploadedFile $file, Classroom $classroom): ?ClassDocument
    {
        $checksum = $this->fileChecksum($file);

        if ($checksum === null) {
            return null;
        }

        $document = $classroom->documents()->where('checksum', $checksum)->first();

        if ($document === null || ! MediaDisk::of($document->disk)->exists($document->path)) {
            return null;
        }

        return $document;
    }

    private function fileChecksum(UploadedFile $file): ?string
    {
        $path = $file->getRealPath();

        if ($path === false) {
            return null;
        }

        $checksum = hash_file('sha256', $path);

        return is_string($checksum) ? $checksum : null;
    }

    private function documentName(UploadedFile $file): string
    {
        $name = basename($file->getClientOriginalName());

        return mb_substr($name === '' ? 'Document.pdf' : $name, 0, 240);
    }
}
