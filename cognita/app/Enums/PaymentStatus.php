<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How far a student is through paying for a course.
 *
 * A free course leaves the enrolment at `free`. A paid course starts at
 * `unpaid`, moves to `pending` when the student says they have paid, and only
 * reaches `paid` when the instructor confirms it. The live room checks that
 * final state, never the intent.
 */
enum PaymentStatus: string
{
    case Free = 'free';
    case Unpaid = 'unpaid';
    case Pending = 'pending';
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Free => 'Free',
            self::Unpaid => 'Unpaid',
            self::Pending => 'Awaiting confirmation',
            self::Paid => 'Paid',
        };
    }

    public function isPaid(): bool
    {
        return $this === self::Paid;
    }

    public function isPending(): bool
    {
        return $this === self::Pending;
    }

    /** Values the instructor may set on a paid enrolment. */
    public static function assignable(): array
    {
        return [self::Unpaid->value, self::Pending->value, self::Paid->value];
    }
}
