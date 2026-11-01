<?php

declare(strict_types=1);

namespace App\Enums;

enum KtEngine: string
{
    case Bkt = 'bkt';
    case Dkt = 'dkt';

    public function label(): string
    {
        return strtoupper($this->value);
    }

    /** Parse a config value, defaulting to BKT for anything unrecognised. */
    public static function fromConfig(?string $value): self
    {
        return self::tryFrom(strtolower((string) $value)) ?? self::Bkt;
    }
}
