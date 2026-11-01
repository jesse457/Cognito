<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin overview: one screen with the platform counts and the newest accounts.
 */
class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'counts' => [
                'users' => User::query()->count(),
                'instructors' => User::query()->where('role', UserRole::Instructor->value)->count(),
                'students' => User::query()->where('role', UserRole::Student->value)->count(),
                'admins' => User::query()->where('role', UserRole::Admin->value)->count(),
                'courses' => Course::query()->count(),
                'classrooms' => Classroom::query()->count(),
            ],
            'recentUsers' => User::query()
                ->latest()
                ->limit(8)
                ->get(['id', 'name', 'email', 'role', 'created_at'])
                ->map(static fn (User $user): array => [
                    'id' => (int) $user->getKey(),
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'created_at' => $user->created_at?->toDateString(),
                ])
                ->values()
                ->all(),
        ]);
    }
}
