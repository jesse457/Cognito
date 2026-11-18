<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\AttendanceRecord;
use App\Models\User;

/** A student sees their own attendance; a class owner sees the register. */
class AttendanceRecordPolicy
{
    public function view(User $actor, AttendanceRecord $record): bool
    {
        return $actor->is($record->student)
            || ($record->classroom !== null && app(ClassroomPolicy::class)->viewAttendance($actor, $record->classroom));
    }

    public function ping(User $actor, AttendanceRecord $record): bool
    {
        return $actor->is($record->student);
    }

    public function leave(User $actor, AttendanceRecord $record): bool
    {
        return $actor->is($record->student);
    }

    public function update(User $actor, AttendanceRecord $record): bool
    {
        return $record->classroom !== null && app(ClassroomPolicy::class)->viewAttendance($actor, $record->classroom);
    }
}
