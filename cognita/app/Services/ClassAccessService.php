<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\UserRole;
use App\Models\ClassEnrollment;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The data-scoping boundary for the whole instructor portal.
 *
 * Every instructor-facing entry point (controller, service, job, listener)
 * resolves a class or a student through this service. It is the single place
 * that answers "may this instructor touch that row?", so a scope mistake cannot
 * be repeated per endpoint:
 *
 *  - the feature flag is checked first (403 when the portal is disabled),
 *  - a missing class is 404 (never 403, so the loop over ids cannot leak),
 *  - another instructor's class is 403,
 *  - a student is reachable only through an ACTIVE membership of one of the
 *    instructor's ACTIVE classes (the same rule as StudentPolicy).
 *
 * Admins/owners keep read access (mirrors PrivateClassPolicy::ownsOrIsAdmin) so
 * the admin panel can reuse the same drill-downs.
 */
class ClassAccessService
{
    /**
     * Resolve a class the instructor is allowed to operate on.
     *
     * @throws NotFoundHttpException when the class does not exist
     * @throws HttpExceptionInterface when the portal is disabled or the class belongs to someone else
     */
    public function assertInstructorOwnsClass(User $instructor, int $classId): PrivateClass
    {
        $this->assertPortalEnabled();

        $class = PrivateClass::query()->with(['instructor'])->find($classId);

        if ($class === null) {
            abort(404, 'Class not found.');
        }

        if (! $this->canAccessClass($instructor, $class)) {
            Log::warning('instructor.access.denied', [
                'event' => 'instructor.class.access_denied',
                'instructor_id' => $instructor->getKey(),
                'class_id' => $class->getKey(),
                'owner_id' => $class->instructor_id,
            ]);

            abort(403, 'You do not have access to this class.');
        }

        return $class;
    }

    /**
     * Assert the student belongs to at least one of the instructor's active classes.
     */
    public function assertStudentInClass(User $instructor, int $studentId): void
    {
        $this->assertPortalEnabled();

        $student = User::query()->find($studentId);

        if ($student === null) {
            abort(404, 'Student not found.');
        }

        if ($this->canAccessStudent($instructor, $student)) {
            return;
        }

        Log::warning('instructor.access.denied', [
            'event' => 'instructor.student.access_denied',
            'instructor_id' => $instructor->getKey(),
            'student_id' => $student->getKey(),
        ]);

        abort(403, 'You do not have access to this student.');
    }

    /**
     * Assert the student is an active member of the given class *and* that the
     * instructor owns that class.
     */
    public function assertStudentInClassForClass(User $instructor, int $classId, int $studentId): void
    {
        $this->assertInstructorOwnsClass($instructor, $classId);

        $this->assertStudentInClass($instructor, $studentId);
    }

    /**
     * All classes the instructor owns, newest first.
     *
     * @return Collection<int, PrivateClass>
     */
    public function classesFor(User $instructor): Collection
    {
        if (! $this->portalEnabled()) {
            return new Collection;
        }

        return PrivateClass::query()
            ->ownedBy($instructor)
            ->orderByDesc('id')
            ->get();
    }

    /**
     * All classes the instructor owns and that are currently active.
     *
     * @return Collection<int, PrivateClass>
     */
    public function activeClassesFor(User $instructor): Collection
    {
        if (! $this->portalEnabled()) {
            return new Collection;
        }

        return PrivateClass::query()
            ->ownedBy($instructor)
            ->active()
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Ids of every active student on any of the instructor's active classes.
     *
     * @return Collection<int, int>
     */
    public function activeStudentIdsFor(User $instructor): Collection
    {
        if (! $this->portalEnabled()) {
            return new Collection;
        }

        return $this->activeStudentIdQuery($instructor)->values();
    }

    /**
     * Ids of the active students on one of the instructor's classes.
     *
     * @return Collection<int, int>
     */
    public function activeStudentIdsForClass(PrivateClass $class): Collection
    {
        return $class->enrollments()
            ->active()
            ->pluck('student_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->unique()
            ->values();
    }

    /**
     * The "is this a student of mine?" predicate without an exception or request.
     *
     * Kept public so the at-risk detector and the dashboard can filter in-memory
     * without re-running the full assert (and so tests can assert the rule).
     */
    public function instructorCanSeeStudent(User $instructor, User $student): bool
    {
        if (! $this->portalEnabled()) {
            return false;
        }

        return $this->canAccessStudent($instructor, $student);
    }

    /** Flag check shared by every portal entry point. */
    public function portalEnabled(): bool
    {
        return (bool) config('features.instructor_path');
    }

    /**
     * Base query of the active student ids across the instructor's active classes.
     *
     * @return Collection<int, int>
     */
    private function activeStudentIdQuery(User $instructor): Collection
    {
        return ClassEnrollment::query()
            ->whereIn('class_id', PrivateClass::query()
                ->ownedBy($instructor)
                ->active()
                ->select('id'))
            ->active()
            ->pluck('student_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->unique()
            ->values();
    }

    private function canAccessClass(User $instructor, PrivateClass $class): bool
    {
        if (! $this->portalEnabled()) {
            return false;
        }

        if ($this->isStaffReader($instructor)) {
            return true;
        }

        return $instructor->getKey() === $class->instructor_id;
    }

    private function canAccessStudent(User $instructor, User $student): bool
    {
        if (! $this->portalEnabled()) {
            return false;
        }

        if ($this->isStaffReader($instructor)) {
            return true;
        }

        return $instructor->instructedPrivateClasses()
            ->where('status', ClassStatus::Active->value)
            ->whereHas('enrollments', function ($query) use ($student): void {
                $query->where('student_id', $student->getKey())
                    ->where('status', EnrollmentStatus::Active->value);
            })
            ->exists();
    }

    /** Admins/owners bypass ownership, mirroring PrivateClassPolicy. */
    private function isStaffReader(User $actor): bool
    {
        return $actor->roleAtLeast(UserRole::Admin);
    }

    private function assertPortalEnabled(): void
    {
        if (! $this->portalEnabled()) {
            abort(403, 'The instructor portal is disabled.');
        }
    }
}
