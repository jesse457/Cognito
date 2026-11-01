<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Course;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only platform inventory: courses and their classes. Admins observe,
 * they do not create or edit teaching content.
 */
class InventoryController extends Controller
{
    public function courses(): Response
    {
        return Inertia::render('Admin/Courses', [
            'courses' => Course::query()
                ->with('instructor:id,name')
                ->withCount('classrooms')
                ->orderByDesc('id')
                ->get()
                ->map(static fn (Course $course): array => [
                    'id' => (int) $course->getKey(),
                    'title' => $course->title,
                    'description' => $course->description,
                    'instructor' => $course->instructor?->name,
                    'classrooms_count' => (int) $course->classrooms_count,
                    'created_at' => $course->created_at?->toDateString(),
                ])
                ->values()
                ->all(),
        ]);
    }

    public function classrooms(): Response
    {
        return Inertia::render('Admin/Classrooms', [
            'classrooms' => Classroom::query()
                ->with(['instructor:id,name', 'course:id,title'])
                ->withCount('enrollments')
                ->orderByDesc('id')
                ->get()
                ->map(static fn (Classroom $classroom): array => [
                    'id' => (int) $classroom->getKey(),
                    'name' => $classroom->name,
                    'course' => $classroom->course?->title,
                    'instructor' => $classroom->instructor?->name,
                    'members' => (int) $classroom->enrollments_count,
                    'created_at' => $classroom->created_at?->toDateString(),
                ])
                ->values()
                ->all(),
        ]);
    }
}
