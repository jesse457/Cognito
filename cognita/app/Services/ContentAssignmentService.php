<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ContentType;
use App\Enums\CourseStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassCourseAssignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\PrivateClass;
use App\Models\StudentContentAssignment;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Instructor-driven content assignment.
 *
 * Assigning a course to a class also enrolls every active class member in that
 * course (idempotent: existing `enrollments` rows are reused). Class size is
 * checked against both `features.max_class_size` and the class' own
 * `max_students`, and a violation is surfaced as a 422 ValidationException.
 */
class ContentAssignmentService
{
    public function __construct(private readonly ClassAccessService $access) {}

    /**
     * Assign a course to a whole class.
     */
    public function assignCourse(
        User $instructor,
        int $classId,
        int $courseId,
        ?CarbonInterface $dueAt = null,
    ): ClassCourseAssignment {
        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        $course = Course::query()->find($courseId);

        if ($course === null) {
            throw ValidationException::withMessages([
                'course_id' => 'The selected course does not exist.',
            ]);
        }

        if ($course->status === CourseStatus::Removed) {
            throw ValidationException::withMessages([
                'course_id' => 'Removed courses cannot be assigned to a class.',
            ]);
        }

        $students = $this->activeStudents($class);

        $this->guardCapacity($class, $students);

        return DB::transaction(function () use ($class, $course, $instructor, $students): ClassCourseAssignment {
            $assignment = ClassCourseAssignment::query()->firstOrCreate(
                [
                    'class_id' => $class->getKey(),
                    'course_id' => $course->getKey(),
                ],
                [
                    'assigned_by' => $instructor->getKey(),
                    'assigned_at' => now(),
                ],
            );

            foreach ($students as $student) {
                $this->enrollStudent($student, $course);
            }

            Log::info('instructor.assignment.course_assigned', [
                'event' => 'instructor.assignment.course_assigned',
                'instructor_id' => (int) $instructor->getKey(),
                'class_id' => (int) $class->getKey(),
                'course_id' => (int) $course->getKey(),
                'students_enrolled' => $students->count(),
                'created' => $assignment->wasRecentlyCreated,
            ]);

            return $assignment;
        });
    }

    /**
     * Assign a single lesson to one class member.
     */
    public function assignLesson(
        User $instructor,
        int $classId,
        int $studentId,
        int $lessonId,
        ?CarbonInterface $dueAt = null,
    ): StudentContentAssignment {
        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        $this->access->assertStudentInClassForClass($instructor, $classId, $studentId);

        $lesson = Lesson::query()->with('module.course')->find($lessonId);

        if ($lesson === null) {
            throw ValidationException::withMessages([
                'lesson_id' => 'The selected lesson does not exist.',
            ]);
        }

        $this->guardSingleStudentCapacity($class);

        return DB::transaction(function () use ($class, $lesson, $instructor, $studentId, $dueAt): StudentContentAssignment {
            $assignment = StudentContentAssignment::query()->firstOrCreate(
                [
                    'class_id' => $class->getKey(),
                    'student_id' => $studentId,
                    'lesson_id' => $lesson->getKey(),
                ],
                [
                    'assigned_by' => $instructor->getKey(),
                    'due_at' => $dueAt,
                ],
            );

            $course = $lesson->module?->course;

            if ($course instanceof Course) {
                $student = User::query()->find($studentId);

                if ($student !== null) {
                    $this->enrollStudent($student, $course);
                }
            }

            Log::info('instructor.assignment.lesson_assigned', [
                'event' => 'instructor.assignment.lesson_assigned',
                'instructor_id' => (int) $instructor->getKey(),
                'class_id' => (int) $class->getKey(),
                'student_id' => $studentId,
                'lesson_id' => (int) $lesson->getKey(),
                'created' => $assignment->wasRecentlyCreated,
            ]);

            return $assignment;
        });
    }

    /**
     * Reuse an existing course enrollment when present; otherwise create one.
     */
    private function enrollStudent(User $student, Course $course): void
    {
        Enrollment::query()->firstOrCreate(
            [
                'user_id' => $student->getKey(),
                'course_id' => $course->getKey(),
            ],
            [
                'enrolled_at' => now(),
            ],
        );
    }

    /**
     * @return Collection<int, User>
     */
    private function activeStudents(PrivateClass $class): Collection
    {
        $ids = $this->access->activeStudentIdsForClass($class);

        if ($ids->isEmpty()) {
            return new Collection;
        }

        return User::query()
            ->whereIn('id', $ids->all())
            ->orderBy('id')
            ->get();
    }

    /**
     * Refuse to enrol a class that has outgrown its configured cap.
     *
     * @param  Collection<int, User>  $students
     */
    private function guardCapacity(PrivateClass $class, Collection $students): void
    {
        $configuredCap = (int) config('features.max_class_size');
        $classCap = (int) $class->max_students;

        $effectiveCap = $configuredCap > 0
            ? min($configuredCap, $classCap > 0 ? $classCap : $configuredCap)
            : $classCap;

        if ($effectiveCap > 0 && $students->count() > $effectiveCap) {
            throw ValidationException::withMessages([
                'class_id' => sprintf(
                    'This class has %d active students, which exceeds its capacity of %d.',
                    $students->count(),
                    $effectiveCap,
                ),
            ]);
        }
    }

    private function guardSingleStudentCapacity(PrivateClass $class): void
    {
        $configuredCap = (int) config('features.max_class_size');

        if ($configuredCap > 0 && ! $class->hasCapacityFor(0) && $class->activeStudentCount() > $configuredCap) {
            throw ValidationException::withMessages([
                'class_id' => 'This class is at capacity and cannot accept new assignments.',
            ]);
        }
    }

    /**
     * Course catalogue visible to instructors for assignment.
     *
     * @return Collection<int, Course>
     */
    public function assignableCourses(): Collection
    {
        if (! $this->access->portalEnabled()) {
            return new Collection;
        }

        return Course::query()
            ->whereIn('status', [CourseStatus::Published->value, CourseStatus::Draft->value])
            ->orderBy('title')
            ->get();
    }

    /**
     * Lessons of a course that an instructor may hand out individually.
     *
     * @return Collection<int, Lesson>
     */
    public function assignableLessons(Course $course): Collection
    {
        if (! $this->access->portalEnabled()) {
            return new Collection;
        }

        return $course->lessons()->orderBy('id')->get();
    }

    /**
     * Lesson types that can be assigned (kept in sync with the Lesson model).
     *
     * @return list<string>
     */
    public function assignableLessonTypes(): array
    {
        return array_map(
            static fn (ContentType $type): string => $type->value,
            ContentType::cases(),
        );
    }

    /**
     * Active member count used by the capacity guard (exposed for tests).
     */
    public function activeMemberCount(PrivateClass $class): int
    {
        return $class->enrollments()->where('status', EnrollmentStatus::Active->value)->count();
    }
}
