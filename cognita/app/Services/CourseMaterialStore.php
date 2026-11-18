<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CourseMaterial;
use App\Models\Lesson;
use App\Models\User;
use App\Support\MediaDisk;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/** Store and remove the files attached to one lesson. */
final class CourseMaterialStore
{
    public function store(
        UploadedFile $file,
        Lesson $lesson,
        ?User $uploader,
        ?string $title = null,
    ): ?CourseMaterial {
        $extension = $file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'bin';
        $name = $title !== null && trim($title) !== ''
            ? trim($title)
            : basename($file->getClientOriginalName());
        $courseId = $lesson->section?->course_id;

        if ($courseId === null) {
            return null;
        }

        $path = $file->storeAs(
            'courses/'.$courseId.'/lessons/'.$lesson->getKey(),
            'material-'.Str::uuid().'.'.$extension,
            [
                'disk' => MediaDisk::name(),
                'CacheControl' => 'private, max-age=2592000, immutable',
            ],
        );

        if ($path === false) {
            return null;
        }

        return $lesson->materials()->create([
            'course_id' => (int) $courseId,
            'uploaded_by' => $uploader?->getKey(),
            'title' => mb_substr($name === '' ? 'Lesson file' : $name, 0, 160),
            'path' => $path,
            'disk' => MediaDisk::name(),
            'mime_type' => $file->getClientMimeType(),
            'size' => max(0, (int) $file->getSize()),
        ]);
    }

    public function delete(CourseMaterial $material): void
    {
        MediaDisk::of($material->disk)->delete($material->path);

        $material->delete();
    }
}
