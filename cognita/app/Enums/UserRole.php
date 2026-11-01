<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The fixed Cognita role hierarchy.
 *
 * Stored as a string column on `users` (never a native DB enum) so that adding
 * a role later is a code change only. Rank is the single source of truth for
 * every ownership / escalation boundary in the application.
 */
enum UserRole: string
{
    case Student = 'student';
    case Instructor = 'instructor';
    case Moderator = 'moderator';
    case Admin = 'admin';
    case Owner = 'owner';

    public function rank(): int
    {
        return match ($this) {
            self::Student => 0,
            self::Instructor => 1,
            self::Moderator => 2,
            self::Admin => 3,
            self::Owner => 4,
        };
    }

    public function atLeast(self $r): bool
    {
        return $this->rank() >= $r->rank();
    }

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** Roles that may enter the always-on admin panel (moderator and above). */
    public function isStaff(): bool
    {
        return $this->atLeast(self::Moderator);
    }

    /** Values that may be granted through staff invitations. */
    public static function invitableValues(): array
    {
        return [self::Admin->value, self::Moderator->value];
    }

    /** @return array<string, int> */
    public static function ranks(): array
    {
        $ranks = [];

        foreach (self::cases() as $case) {
            $ranks[$case->value] = $case->rank();
        }

        return $ranks;
    }
}
