<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * The single authorization and scoping boundary for classes.
 *
 * Every controller, service and call-token request resolves a class through
 * this class, so "may this user touch that class?" is answered in exactly one
 * place. Missing rows are 404 and forbidden ones 403, so a probe can never
 * distinguish "does not exist" from "not yours".
 */
class ClassroomAccess
{
    public const ROLE_HOST = 'host';

    public const ROLE_PARTICIPANT = 'participant';

    /** Classes the instructor owns, newest first, with roster counts. */
    public function forInstructor(User $instructor): Collection
    {
        return Classroom::query()
            ->with('course:id,title')
            ->withCount('enrollments')
            ->ownedBy($instructor)
            ->orderByDesc('id')
            ->get();
    }

    /** Classes a student has joined with a key, newest first. */
    public function forStudent(User $student): Collection
    {
        return Classroom::query()
            ->with(['course:id,title', 'instructor:id,name'])
            ->withCount('enrollments')
            ->whereHas('enrollments', fn ($query) => $query->where('student_id', $student->getKey()))
            ->orderByDesc('id')
            ->get();
    }

    public function assertInstructorOwnsClassroom(User $instructor, Classroom $classroom): Classroom
    {
        if ((int) $classroom->instructor_id !== (int) $instructor->getKey()) {
            abort(403, 'This class belongs to another instructor.');
        }

        return $classroom;
    }

    public function assertStudentMember(User $student, Classroom $classroom): Classroom
    {
        if (! $classroom->hasMember($student)) {
            abort(403, 'Join this class with its key first.');
        }

        return $classroom;
    }

    /**
     * Resolve the caller's role in a class group call.
     *
     * @return array{classroom: Classroom, role: string}
     */
    public function assertCanJoinCall(User $user, Classroom $classroom): array
    {
        if ((int) $classroom->instructor_id === (int) $user->getKey()) {
            return ['classroom' => $classroom, 'role' => self::ROLE_HOST];
        }

        if ($classroom->hasMember($user)) {
            return ['classroom' => $classroom, 'role' => self::ROLE_PARTICIPANT];
        }

        // Admins may observe a class board from the admin console but never
        // join a room they do not teach or attend.
        abort(403, 'You are not a member of this class.');
    }

    /**
     * Accept a class key for a student.
     *
     * Joining is idempotent: entering the key again returns the same class
     * instead of creating a duplicate membership.
     *
     * @throws ValidationException when the key does not match a class
     */
    public function lookupByJoinCode(string $rawKey): ?Classroom
    {
        $key = Classroom::normalizeJoinCode($rawKey);

        if ($key === '') {
            return null;
        }

        return Classroom::query()->where('join_code', $key)->first();
    }

    public function join(User $student, string $rawKey): Classroom
    {
        $classroom = $this->lookupByJoinCode($rawKey);

        if ($classroom === null) {
            throw ValidationException::withMessages([
                'key' => 'That class key does not match any class. Check it with your instructor.',
            ]);
        }

        Enrollment::query()->firstOrCreate(
            [
                'classroom_id' => $classroom->getKey(),
                'student_id' => $student->getKey(),
            ],
            ['joined_at' => now()],
        );

        return $classroom;
    }

    /** Admins read every class; the admin console never writes classes. */
    public function forAdmin(): Collection
    {
        return Classroom::query()
            ->with(['instructor:id,name', 'course:id,title'])
            ->withCount('enrollments')
            ->orderByDesc('id')
            ->get();
    }

    /** Instructors and students are routed to their surface after sign-in. */
    public function dashboardFor(User $user): string
    {
        return match ($user->role) {
            UserRole::Admin => route('admin.dashboard'),
            UserRole::Instructor => route('instructor.dashboard'),
            UserRole::Student => route('student.home'),
        };
    }
}
