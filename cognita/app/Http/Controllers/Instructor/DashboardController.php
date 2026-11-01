<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ClassroomAccess;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Instructor home: every course and class the instructor owns, with the counts
 * that matter for a live class (members and last activity).
 */
class DashboardController extends Controller
{
    public function __invoke(ClassroomAccess $access): Response
    {
        /** @var User $instructor */
        $instructor = request()->user();

        $classrooms = $access->forInstructor($instructor);
        $courses = $instructor->courses()
            ->withCount('classrooms')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('Instructor/Dashboard', [
            'courses' => $courses
                ->map(static fn ($course): array => [
                    'id' => (int) $course->getKey(),
                    'title' => $course->title,
                    'description' => $course->description,
                    'classrooms_count' => (int) $course->classrooms_count,
                ])
                ->values()
                ->all(),
            'classrooms' => $classrooms
                ->map(static fn ($classroom): array => [
                    'id' => (int) $classroom->getKey(),
                    'name' => $classroom->name,
                    'join_code' => $classroom->join_code,
                    'course' => $classroom->course?->title,
                    'members' => (int) $classroom->enrollments_count,
                    'call_url' => route('call.show', ['classroom' => $classroom->getKey()]),
                ])
                ->values()
                ->all(),
        ]);
    }
}
