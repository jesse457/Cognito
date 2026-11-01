<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What the live-call board is showing. One surface can be active at a time for
 * a class; the instructor switches it from the call view.
 */
enum BoardSurface: string
{
    case Canvas = 'canvas';
    case Notebook = 'notebook';
    case Pdf = 'pdf';

    public function label(): string
    {
        return match ($this) {
            self::Canvas => 'Canvas',
            self::Notebook => 'Notebook',
            self::Pdf => 'PDF',
        };
    }

    public function usesDocument(): bool
    {
        return $this === self::Pdf;
    }

    /** Values accepted by the update request. */
    public static function values(): array
    {
        return array_map(static fn (self $surface): string => $surface->value, self::cases());
    }
}
