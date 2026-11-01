<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Enums\CourseStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Student\CourseResource;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $courses = Course::query()
            ->where('status', CourseStatus::Published->value)
            ->withCount(['modules', 'lessons', 'enrollments'])
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search')->toString().'%';
                $query->where(fn ($builder) => $builder
                    ->where('title', 'ILIKE', $search)
                    ->orWhere('description', 'ILIKE', $search));
            })
            ->orderBy('title')
            ->paginate((int) $request->integer('per_page', 20));

        $enrolledIds = $user->enrollments()->pluck('course_id')->all();

        return response()->json([
            'data' => $courses->getCollection()->map(
                fn (Course $course): array => (new CourseResource($course, in_array($course->getKey(), $enrolledIds, true)))->resolve(),
            )->all(),
            'meta' => [
                'current_page' => $courses->currentPage(),
                'per_page' => $courses->perPage(),
                'total' => $courses->total(),
            ],
        ]);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        abort_if($course->status !== CourseStatus::Published, 404);

        /** @var User $user */
        $user = $request->user();

        $enrolled = $user->enrollments()->where('course_id', $course->getKey())->exists();

        $course->load([
            'modules' => fn ($query) => $query->orderBy('sequence_order'),
            'modules.lessons' => fn ($query) => $query->orderBy('sequence_order'),
            'knowledgeComponents',
            'instructor:id,name,display_name',
        ]);

        return response()->json([
            'data' => (new CourseResource($course, $enrolled))->withCurriculum()->resolve(),
        ]);
    }
}
