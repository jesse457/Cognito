<?php

declare(strict_types=1);

namespace App\Enums;

/** Currencies Cognita can price courses in. */
enum Currency: string
{
    case XAF = 'XAF';
    case USD = 'USD';
    case EUR = 'EUR';

    public function label(): string
    {
        return match ($this) {
            self::XAF => 'Central African CFA franc (XAF)',
            self::USD => 'US dollar (USD)',
            self::EUR => 'Euro (EUR)',
        };
    }

    public function symbol(): string
    {
        return match ($this) {
            self::XAF => 'FCFA',
            self::USD => '$',
            self::EUR => '€',
        };
    }

    /** Values accepted by course pricing forms. */
    public static function values(): array
    {
        return array_map(static fn (self $currency): string => $currency->value, self::cases());
    }
}
