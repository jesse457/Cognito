<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PaymentStatus;
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
            ->with('course:id,title,is_paid,price_cents,currency,payment_url,payment_instructions')
            ->withCount('enrollments')
            ->ownedBy($instructor)
            ->orderByDesc('id')
            ->get();
    }

    /** Classes a student has joined with a key, newest first. */
    public function forStudent(User $student): Collection
    {
        return Classroom::query()
            ->with([
                'course:id,title,is_paid,price_cents,currency,payment_url,payment_instructions',
                'instructor:id,name',
                // The caller's own membership, so payment state per class does
                // not become one query per card.
                'enrollments' => fn ($query) => $query->where('student_id', $student->getKey()),
            ])
            ->withCount('enrollments')
            ->whereHas('enrollments', fn ($query) => $query->where('student_id', $student->getKey()))
            ->orderByDesc('id')
            ->get();
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

        $enrollment = Enrollment::query()->firstOrCreate(
            [
                'classroom_id' => $classroom->getKey(),
                'student_id' => $student->getKey(),
            ],
            [
                'joined_at' => now(),
                'payment_status' => $classroom->requiresPayment()
                    ? PaymentStatus::Unpaid->value
                    : PaymentStatus::Free->value,
            ],
        );

        // A course may have turned paid after the student first joined. Their
        // membership is still valid, but the live room now needs a payment;
        // mark the intent explicitly instead of leaving it looking free.
        if ($classroom->requiresPayment() && $enrollment->payment_status === PaymentStatus::Free) {
            $enrollment->forceFill(['payment_status' => PaymentStatus::Unpaid])->save();
        }

        return $classroom;
    }

    /** Admins read every class; the admin console never writes classes. */
    public function forAdmin(): Collection
    {
        return Classroom::query()
            ->with(['instructor:id,name', 'course:id,title,is_paid,price_cents,currency,payment_url,payment_instructions'])
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
