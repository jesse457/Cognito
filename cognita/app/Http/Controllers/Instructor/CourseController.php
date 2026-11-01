<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Course creation is deliberately tiny: a title, an optional description, and
 * the instructor who owns it. Classes carry the live group call.
 */
class CourseController extends Controller
{
    public function index(): Response
    {
        /** @var User $instructor */
        $instructor = request()->user();

        return Inertia::render('Instructor/Courses', [
            'courses' => $instructor->courses()
                ->withCount('classrooms')
                ->orderByDesc('id')
                ->get()
                ->map(static fn (Course $course): array => [
                    'id' => (int) $course->getKey(),
                    'title' => $course->title,
                    'description' => $course->description,
                    'classrooms_count' => (int) $course->classrooms_count,
                    'created_at' => $course->created_at?->toDateString(),
                ])
                ->values()
                ->all(),
        ]);
    }

    public function store(StoreCourseRequest $request): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        /** @var array{title: string, description?: string|null} $data */
        $data = $request->validated();

        Course::query()->create([
            'instructor_id' => $instructor->getKey(),
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
        ]);

        return back()->with('success', 'Course created.');
    }

    public function update(UpdateCourseRequest $request, Course $course): RedirectResponse
    {
        $this->authorizeOwnership($request->user(), $course);

        /** @var array{title: string, description?: string|null} $data */
        $data = $request->validated();

        $course->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
        ]);

        return back()->with('success', 'Course updated.');
    }

    public function destroy(Course $course): RedirectResponse
    {
        $this->authorizeOwnership(request()->user(), $course);

        $course->delete();

        return back()->with('success', 'Course removed. Its classes were kept.');
    }

    private function authorizeOwnership(?User $user, Course $course): void
    {
        abort_if($user === null, 401);

        abort_if((int) $course->instructor_id !== (int) $user->getKey(), 403, 'This course belongs to another instructor.');
    }
}
