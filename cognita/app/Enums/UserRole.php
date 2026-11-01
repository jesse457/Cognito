<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The three roles Cognita supports. Stored as a string column so a new role is
 * a code change only; the middleware and the shared Inertia props read it
 * through this enum.
 */
enum UserRole: string
{
    case Student = 'student';
    case Instructor = 'instructor';
    case Admin = 'admin';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** Roles an administrator may assign from the users screen. */
    public static function assignable(): array
    {
        return array_map(static fn (self $role): string => $role->value, self::cases());
    }
}
