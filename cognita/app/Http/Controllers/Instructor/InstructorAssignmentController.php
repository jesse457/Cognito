<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Instructor\AssignCourseRequest;
use App\Http\Requests\Instructor\AssignLessonRequest;
use App\Http\Resources\Instructor\ContentAssignmentResource;
use App\Http\Resources\Instructor\CourseAssignmentResource;
use App\Models\User;
use App\Services\ClassAccessService;
use App\Services\ContentAssignmentService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;

/**
 * Content assignment: a course to the whole class, or a lesson to one student.
 *
 * Class scoping happens first (ClassAccessService); capacity violations surface
 * from the service as 422 ValidationException.
 */
class InstructorAssignmentController extends Controller
{
    public function __construct(
        private readonly ContentAssignmentService $assignments,
        private readonly ClassAccessService $access,
    ) {}

    public function assignCourse(AssignCourseRequest $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        /** @var array{course_id:int, due_at?:string|null} $data */
        $data = $request->validated();

        $assignment = $this->assignments->assignCourse(
            $instructor,
            $class,
            (int) $data['course_id'],
            $this->toCarbon($data['due_at'] ?? null),
        );

        $assignment->load('course:id,title,status');

        return (new CourseAssignmentResource($assignment))
            ->response()
            ->setStatusCode(201);
    }

    public function assignLesson(AssignLessonRequest $request, int $class, int $student): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertStudentInClassForClass($instructor, $class, $student);

        /** @var array{lesson_id:int, due_at?:string|null} $data */
        $data = $request->validated();

        $assignment = $this->assignments->assignLesson(
            $instructor,
            $class,
            $student,
            (int) $data['lesson_id'],
            $this->toCarbon($data['due_at'] ?? null),
        );

        $assignment->load('lesson:id,title,content_type');

        return (new ContentAssignmentResource($assignment))
            ->response()
            ->setStatusCode(201);
    }

    private function toCarbon(?string $value): ?CarbonInterface
    {
        return $value === null || $value === '' ? null : Carbon::parse($value);
    }
}
