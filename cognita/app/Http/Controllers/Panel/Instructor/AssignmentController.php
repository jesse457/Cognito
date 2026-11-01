<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Instructor;

use App\Http\Controllers\Controller;
use App\Models\ClassCourseAssignment;
use App\Models\StudentContentAssignment;
use App\Models\User;
use App\Services\ClassAccessService;
use App\Services\ContentAssignmentService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Content assignment from the console: a course to the whole class, or one
 * lesson to one student.
 *
 * Class scoping runs first through ClassAccessService. Capacity violations and
 * unknown ids surface from the service as a 422 ValidationException, which the
 * redirect back renders inline on the form.
 */
class AssignmentController extends Controller
{
    public function __construct(
        private readonly ClassAccessService $access,
        private readonly ContentAssignmentService $assignments,
    ) {}

    public function assignCourse(Request $request, int $class): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        /** @var array{course_id:int|string, due_at?:string|null} $data */
        $data = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'due_at' => ['nullable', 'date'],
        ]);

        $assignment = $this->assignments->assignCourse(
            $instructor,
            $class,
            (int) $data['course_id'],
            $this->toCarbon($data['due_at'] ?? null),
        );

        return back()->with('success', $this->courseMessage($assignment));
    }

    public function assignLesson(Request $request, int $class, int $student): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertStudentInClassForClass($instructor, $class, $student);

        /** @var array{lesson_id:int|string, due_at?:string|null} $data */
        $data = $request->validate([
            'lesson_id' => ['required', 'integer', 'exists:lessons,id'],
            'due_at' => ['nullable', 'date'],
        ]);

        $assignment = $this->assignments->assignLesson(
            $instructor,
            $class,
            $student,
            (int) $data['lesson_id'],
            $this->toCarbon($data['due_at'] ?? null),
        );

        return back()->with('success', $this->lessonMessage($assignment));
    }

    private function courseMessage(ClassCourseAssignment $assignment): string
    {
        $assignment->loadMissing('course:id,title');

        $title = $assignment->course?->title ?? 'The course';

        return $assignment->wasRecentlyCreated
            ? sprintf('%s assigned to the class. Every active student was enrolled.', $title)
            : sprintf('%s was already assigned to this class.', $title);
    }

    private function lessonMessage(StudentContentAssignment $assignment): string
    {
        $assignment->loadMissing('lesson:id,title');

        $title = $assignment->lesson?->title ?? 'The lesson';

        return $assignment->wasRecentlyCreated
            ? sprintf('Lesson "%s" assigned.', $title)
            : sprintf('Lesson "%s" was already assigned to this student.', $title);
    }

    private function toCarbon(?string $value): ?CarbonInterface
    {
        return $value === null || $value === '' ? null : Carbon::parse($value);
    }
}
