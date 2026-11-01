<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClassroomRequest;
use App\Http\Requests\UpdateClassroomRequest;
use App\Models\Classroom;
use App\Models\User;
use App\Services\ClassroomAccess;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Class management: create a class, keep its key, open its live group call.
 */
class ClassroomController extends Controller
{
    public function __construct(private readonly ClassroomAccess $access) {}

    public function show(Classroom $classroom): Response
    {
        /** @var User $instructor */
        $instructor = request()->user();

        $this->access->assertInstructorOwnsClassroom($instructor, $classroom);

        $classroom->load(['course:id,title', 'board', 'enrollments.student:id,name,email']);

        return Inertia::render('Instructor/Classroom', [
            'classroom' => [
                'id' => (int) $classroom->getKey(),
                'name' => $classroom->name,
                'join_code' => $classroom->join_code,
                'course_id' => $classroom->course_id === null ? null : (int) $classroom->course_id,
                'course' => $classroom->course?->title,
                'created_at' => $classroom->created_at?->toDateString(),
                'call_url' => route('call.show', ['classroom' => $classroom->getKey()]),
                'board' => [
                    'surface' => $classroom->board?->surface->value ?? 'canvas',
                    'students_can_annotate' => (bool) $classroom->board?->students_can_annotate,
                    'has_document' => (bool) $classroom->board?->hasDocument(),
                ],
            ],
            'students' => $classroom->enrollments
                ->sortBy(fn ($enrollment): string => (string) $enrollment->student?->name)
                ->map(static fn ($enrollment): array => [
                    'id' => (int) $enrollment->student_id,
                    'name' => (string) $enrollment->student?->name,
                    'email' => (string) $enrollment->student?->email,
                    'joined_at' => $enrollment->joined_at?->toDateString(),
                ])
                ->values()
                ->all(),
            'courses' => $instructor->courses()
                ->orderBy('title')
                ->get(['id', 'title'])
                ->map(static fn ($course): array => ['id' => (int) $course->getKey(), 'title' => $course->title])
                ->values()
                ->all(),
        ]);
    }

    public function store(StoreClassroomRequest $request): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        /** @var array{name: string, course_id?: int|null} $data */
        $data = $request->validated();

        $classroom = Classroom::query()->create([
            'instructor_id' => $instructor->getKey(),
            'course_id' => $data['course_id'] ?? null,
            'name' => $data['name'],
        ]);

        return redirect()
            ->route('instructor.classes.show', ['classroom' => $classroom->getKey()])
            ->with('success', 'Class created. Share its key with your students.');
    }

    public function update(UpdateClassroomRequest $request, Classroom $classroom): RedirectResponse
    {
        $this->access->assertInstructorOwnsClassroom($request->user(), $classroom);

        /** @var array{name: string, course_id?: int|null} $data */
        $data = $request->validated();

        $classroom->update([
            'name' => $data['name'],
            'course_id' => $data['course_id'] ?? null,
        ]);

        return back()->with('success', 'Class updated.');
    }

    public function destroy(Classroom $classroom): RedirectResponse
    {
        $this->access->assertInstructorOwnsClassroom(request()->user(), $classroom);

        $classroom->delete();

        return redirect()
            ->route('instructor.dashboard')
            ->with('success', 'Class deleted.');
    }

    /** Rotate the join key, for example after it leaked into the wrong group chat. */
    public function rotateKey(Classroom $classroom): RedirectResponse
    {
        $this->access->assertInstructorOwnsClassroom(request()->user(), $classroom);

        $classroom->forceFill(['join_code' => Classroom::generateJoinCode()])->save();

        return back()->with('success', 'A new class key was generated.');
    }
}
