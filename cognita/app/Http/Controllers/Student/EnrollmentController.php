<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Enums\CourseStatus;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    /** Idempotent: enrolling twice keeps a single enrollment row. */
    public function store(Request $request, Course $course): JsonResponse
    {
        abort_if($course->status !== CourseStatus::Published, 404);

        /** @var User $user */
        $user = $request->user();

        $enrollment = Enrollment::query()->firstOrCreate(
            ['user_id' => $user->getKey(), 'course_id' => $course->getKey()],
            ['enrolled_at' => now()],
        );

        return response()->json([
            'data' => [
                'course_id' => $course->getKey(),
                'enrolled' => true,
                'enrolled_at' => $enrollment->enrolled_at?->toIso8601String(),
                'created' => $enrollment->wasRecentlyCreated,
            ],
        ], $enrollment->wasRecentlyCreated ? 201 : 200);
    }
}
