<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The three roles Cognita supports. Stored as a string column so a new role is
 * a code change only; policies and the shared Inertia props read it through
 * this enum.
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

    /**
     * The capabilities this role grants before ownership checks are applied.
     *
     * @return list<Permission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Student => [
                Permission::Learn,
                Permission::AskQuestions,
            ],
            self::Instructor => [
                Permission::ManageCourses,
                Permission::ManageCurriculum,
                Permission::ManageClassrooms,
                Permission::ModerateCalls,
                Permission::ManageClassMaterials,
                Permission::ConfirmPayments,
                Permission::AskQuestions,
            ],
            self::Admin => [
                Permission::ViewAdminConsole,
                Permission::ManageUsers,
            ],
        };
    }

    public function allows(Permission $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }

    /** Roles an administrator may assign from the users screen. */
    public static function assignable(): array
    {
        return array_map(static fn (self $role): string => $role->value, self::cases());
    }
}
