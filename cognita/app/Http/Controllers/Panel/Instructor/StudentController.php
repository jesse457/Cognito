<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Instructor;

use App\Http\Controllers\Controller;
use App\Models\InstructorNote;
use App\Models\User;
use App\Services\ClassAccessService;
use App\Services\ContentAssignmentService;
use App\Services\StudentProgressService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Per-student mastery drill-down: the KT engine's per-knowledge-component
 * rows, the instructor's private notes and a single-lesson assignment form.
 *
 * Both ids are resolved through ClassAccessService: the instructor must own the
 * class and the student must be an active member of it. Mastery numbers come
 * straight from StudentProgressService; nothing is recomputed here.
 */
class StudentController extends Controller
{
    public function __construct(
        private readonly ClassAccessService $access,
        private readonly StudentProgressService $progress,
        private readonly ContentAssignmentService $assignments,
    ) {}

    public function show(Request $request, int $class, int $student): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertStudentInClassForClass($instructor, $class, $student);

        $model = $this->access->assertInstructorOwnsClass($instructor, $class);

        $drillDown = $this->progress->drillDown($instructor, $student);

        return Inertia::render('Instructor/Students/Show', [
            'class' => [
                'id' => (int) $model->getKey(),
                'name' => $model->name,
            ],
            'student' => [
                'id' => (int) $drillDown['student']['id'],
                'name' => (string) $drillDown['student']['name'],
                'display_label' => (string) $drillDown['student']['name'],
                'email' => $drillDown['student']['email'],
            ],
            'rows' => $drillDown['rows'],
            'notes' => $this->notesFor($instructor, $class, $student),
            'lessons' => $this->lessonOptions(),
            'threshold' => (float) config('features.at_risk_threshold'),
        ]);
    }

    /**
     * The current instructor's private notes about this student.
     *
     * InstructorNote rows are a private teaching journal: readable by the
     * authoring instructor only, never by the student or by other instructors.
     *
     * @return list<array{id:int, note:string, instructor:string|null, created_at:string|null}>
     */
    private function notesFor(User $instructor, int $classId, int $studentId): array
    {
        return InstructorNote::query()
            ->with('instructor:id,name,display_name')
            ->where('class_id', $classId)
            ->where('student_id', $studentId)
            ->where('instructor_id', $instructor->getKey())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(static fn (InstructorNote $note): array => [
                'id' => (int) $note->getKey(),
                'note' => $note->note,
                'instructor' => $note->instructor?->displayLabel(),
                'created_at' => $note->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /**
     * Assignable lessons grouped by course.
     *
     * @return list<array{course_id:int, course_title:string, lessons:list<array{id:int, title:string}>}>
     */
    private function lessonOptions(): array
    {
        $options = [];

        foreach ($this->assignments->assignableCourses() as $course) {
            $lessons = $this->assignments
                ->assignableLessons($course)
                ->map(static fn ($lesson): array => [
                    'id' => (int) $lesson->getKey(),
                    'title' => (string) $lesson->title,
                ])
                ->values()
                ->all();

            if ($lessons === []) {
                continue;
            }

            $options[] = [
                'course_id' => (int) $course->getKey(),
                'course_title' => (string) $course->title,
                'lessons' => $lessons,
            ];
        }

        return $options;
    }
}
