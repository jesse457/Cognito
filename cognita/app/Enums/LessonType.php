<?php

declare(strict_types=1);

namespace App\Enums;

/** How a lesson is learned. */
enum LessonType: string
{
    case Video = 'video';
    case Article = 'article';
    case Quiz = 'quiz';

    public function label(): string
    {
        return match ($this) {
            self::Video => 'Video',
            self::Article => 'Article',
            self::Quiz => 'Quiz',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::Video => 'video-camera',
            self::Article => 'article',
            self::Quiz => 'exam',
        };
    }

    /** Values accepted by lesson forms. */
    public static function values(): array
    {
        return array_map(static fn (self $type): string => $type->value, self::cases());
    }
}
