<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadCourseMaterialRequest;
use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\Lesson;
use App\Services\CourseMaterialStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Upload and remove files attached to a course outline. */
class CourseMaterialController extends Controller
{
    public function __construct(private readonly CourseMaterialStore $materials) {}

    public function store(UploadCourseMaterialRequest $request, Course $course): RedirectResponse
    {
        $this->authorize('manageCurriculum', $course);

        $file = $request->file('document');

        if ($file === null) {
            return back()->with('error', 'Choose a file to upload.');
        }

        /** @var array{title?: string|null, lesson_id: int} $data */
        $data = $request->validated();

        $lesson = Lesson::query()
            ->whereHas('section', fn ($query) => $query->where('course_id', $course->getKey()))
            ->findOrFail($data['lesson_id']);

        $material = $this->materials->store($file, $lesson, $request->user(), $data['title'] ?? null);

        if ($material === null) {
            return back()->with('error', 'The file could not be stored. Try again.');
        }

        return back()->with('success', $material->title.' is now attached to '.$lesson->title.'.');
    }

    public function destroy(Request $request, Course $course, CourseMaterial $material): RedirectResponse
    {
        $this->authorize('delete', $material);
        abort_unless((int) $material->course_id === (int) $course->getKey(), 404);

        $this->materials->delete($material);

        return back()->with('success', 'Course material removed.');
    }
}
