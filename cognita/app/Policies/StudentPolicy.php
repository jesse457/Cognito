<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\UserRole;
use App\Models\User;

/**
 * Instructor → student data boundary.
 *
 * An instructor may look at a student **only** when that student is an active
 * member of one of the instructor's active private classes. Staff are allowed
 * through so the admin panel keeps working. With the instructor path disabled
 * every non-staff check fails closed.
 */
class StudentPolicy
{
    public function view(User $instructor, User $student): bool
    {
        if ($instructor->roleAtLeast(UserRole::Admin)) {
            return true;
        }

        if (! config('features.instructor_path')) {
            return false;
        }

        if (! $instructor->isInstructor()) {
            return false;
        }

        return $instructor->instructedPrivateClasses()
            ->where('status', ClassStatus::Active->value)
            ->whereHas('enrollments', function ($query) use ($student): void {
                $query->where('student_id', $student->getKey())
                    ->where('status', EnrollmentStatus::Active->value);
            })
            ->exists();
    }

    public function viewAny(User $instructor): bool
    {
        return $instructor->roleAtLeast(UserRole::Admin)
            || ($instructor->isInstructor() && (bool) config('features.instructor_path'));
    }
}
