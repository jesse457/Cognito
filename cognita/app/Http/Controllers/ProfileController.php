<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function show(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        return Inertia::render('Profile/Show', [
            'user' => [
                'id' => (int) $user->getKey(),
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role?->value ?? 'student',
                'role_label' => $user->role?->label() ?? 'Student',
                'status' => $user->status?->value ?? 'active',
                'initials' => $user->initials(),
                'member_since' => $user->created_at?->toDateString(),
            ],
            'totals' => [
                'courses_teaching' => Course::query()->where('instructor_id', $user->getKey())->count(),
                'courses_studying' => Enrollment::query()
                    ->where('student_id', $user->getKey())
                    ->distinct('classroom_id')
                    ->count('classroom_id'),
                'classes' => $user->isInstructor()
                    ? Classroom::query()->where('instructor_id', $user->getKey())->count()
                    : Classroom::query()->whereHas('enrollments', fn ($query) => $query->where('student_id', $user->getKey()))->count(),
                'posts' => Question::query()->where('user_id', $user->getKey())->count(),
            ],
        ]);
    }
}
