<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Capabilities the role matrix grants. Policies decide whether a particular
 * user may exercise one on a particular model; controllers never read these
 * directly.
 */
enum Permission: string
{
    case ViewAdminConsole = 'view-admin-console';
    case ManageUsers = 'manage-users';
    case ManageCourses = 'manage-courses';
    case ManageCurriculum = 'manage-curriculum';
    case ManageClassrooms = 'manage-classrooms';
    case ModerateCalls = 'moderate-calls';
    case ManageClassMaterials = 'manage-class-materials';
    case ConfirmPayments = 'confirm-payments';
    case Learn = 'learn';
    case AskQuestions = 'ask-questions';

    public function label(): string
    {
        return match ($this) {
            self::ViewAdminConsole => 'View admin console',
            self::ManageUsers => 'Manage users',
            self::ManageCourses => 'Manage courses',
            self::ManageCurriculum => 'Manage curriculum',
            self::ManageClassrooms => 'Manage classrooms',
            self::ModerateCalls => 'Moderate live calls',
            self::ManageClassMaterials => 'Manage class materials',
            self::ConfirmPayments => 'Confirm course payments',
            self::Learn => 'Learn in enrolled courses',
            self::AskQuestions => 'Ask and answer questions',
        };
    }
}
