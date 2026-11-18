<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

/**
 * Where the product's media lives.
 *
 * Every byte a user uploads — a class PDF, a photo on a question — goes to
 * one disk, and every row remembers which disk it came from, so a file can
 * still be found after the configuration changes.
 */
class MediaDisk
{
    /** The disk new media is written to. */
    public static function name(): string
    {
        return (string) config('filesystems.media_disk', 's3');
    }

    /**
     * The disk a particular file was written to.
     *
     * A row without a disk of its own is read from the configured media disk.
     */
    public static function of(?string $disk): Filesystem
    {
        return Storage::disk($disk !== null && $disk !== '' ? $disk : self::name());
    }
}
