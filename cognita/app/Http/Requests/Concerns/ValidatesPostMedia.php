<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

/**
 * The photo rules shared by question and answer composers.
 *
 * Only raster images are accepted: an SVG can carry script, and serving one
 * from the same origin as the app would turn a screenshot into an attack.
 */
trait ValidatesPostMedia
{
    /**
     * @return array<string, mixed>
     */
    protected function mediaRules(): array
    {
        return [
            'media' => ['nullable', 'array', 'max:5'],
            'media.*' => [
                'file',
                'mimetypes:image/jpeg,image/png,image/gif,image/webp',
                'max:10240',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function mediaMessages(): array
    {
        return [
            'media.max' => 'Attach up to 5 photos.',
            'media.*.mimetypes' => 'Photos must be JPG, PNG, GIF or WebP images.',
            'media.*.max' => 'Each photo must be 10 MB or smaller.',
            'media.*.uploaded' => 'One of the photos could not be uploaded. Try a smaller image.',
        ];
    }
}
