<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Answer;
use App\Models\PostMedia;
use App\Models\Question;
use App\Services\ClassroomAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Photos are private by default: the file is streamed only after the same
 * access check that guards the question, so a class-only screenshot cannot be
 * fetched by anyone who happens to learn its id.
 */
class PostMediaController extends Controller
{
    public function show(Request $request, PostMedia $media, ClassroomAccess $access): StreamedResponse
    {
        $mediable = $media->mediable;

        $question = match (true) {
            $mediable instanceof Question => $mediable,
            $mediable instanceof Answer => $mediable->question,
            default => null,
        };

        abort_if($question === null, 404);

        $access->assertQuestionAccess($request->user(), $question);

        abort_unless(str_starts_with($media->mime, 'image/'), 404);

        $disk = Storage::disk('local');

        abort_unless($disk->exists($media->path), 404);

        return $disk->response($media->path, $media->name, [
            'Content-Type' => $media->mime,
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
