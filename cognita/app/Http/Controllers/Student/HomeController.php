<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ClassroomAccess;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student home: the classes this student joined with a key, each one a step
 * away from its live group call.
 */
class HomeController extends Controller
{
    public function __construct(private readonly ClassroomAccess $access) {}

    public function index(Request $request): Response
    {
        /** @var User $student */
        $student = $request->user();

        return Inertia::render('Student/Home', [
            'classrooms' => $this->access->forStudent($student)
                ->map(static fn ($classroom): array => [
                    'id' => (int) $classroom->getKey(),
                    'name' => $classroom->name,
                    'join_code' => $classroom->join_code,
                    'course' => $classroom->course?->title,
                    'instructor' => $classroom->instructor?->name,
                    'members' => (int) $classroom->enrollments_count,
                    'call_url' => route('call.show', ['classroom' => $classroom->getKey()]),
                ])
                ->values()
                ->all(),
        ]);
    }
}
