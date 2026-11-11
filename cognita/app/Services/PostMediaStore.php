<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Attach validated photos to a question or answer.
 *
 * The bytes stay on the private local disk; the row is only a pointer that the
 * media controller turns into an access-checked URL.
 */
class PostMediaStore
{
    /**
     * @param  array<int, mixed>  $files
     */
    public function attach(Question|Answer $owner, array $files, User $uploader): void
    {
        $directory = $owner instanceof Question ? 'questions' : 'answers';

        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $path = $file->store("community/{$directory}/{$owner->getKey()}", 'local');

            if ($path === false) {
                continue;
            }

            $owner->media()->create([
                'user_id' => $uploader->getKey(),
                'name' => Str::limit(basename(str_replace('\\', '/', $file->getClientOriginalName())), 255, ''),
                'path' => $path,
                'mime' => $file->getMimeType() ?? 'application/octet-stream',
                'size' => (int) $file->getSize(),
            ]);
        }
    }
}
