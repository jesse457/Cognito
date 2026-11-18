<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Enrollment;
use App\Models\User;

/** A student's own membership and the payment that unlocks it. */
class EnrollmentPolicy
{
    public function view(User $actor, Enrollment $enrollment): bool
    {
        return $actor->is($enrollment->student)
            || ($enrollment->classroom !== null
                && (int) $enrollment->classroom->instructor_id === (int) $actor->getKey())
            || $actor->isAdmin();
    }

    public function reportPayment(User $actor, Enrollment $enrollment): bool
    {
        return $actor->is($enrollment->student)
            && $actor->hasPermission(Permission::Learn)
            && $enrollment->classroom?->requiresPayment() === true
            && $enrollment->classroom?->hasMember($actor) === true;
    }

    public function confirmPayment(User $actor, Enrollment $enrollment): bool
    {
        return $actor->hasPermission(Permission::ConfirmPayments)
            && $enrollment->classroom !== null
            && (int) $enrollment->classroom->instructor_id === (int) $actor->getKey();
    }
}
