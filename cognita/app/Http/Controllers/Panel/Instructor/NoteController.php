<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Instructor;

use App\Http\Controllers\Controller;
use App\Models\InstructorNote;
use App\Models\User;
use App\Services\ClassAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Write a private note about a student.
 *
 * The note is scoped to the current instructor (author), so it is never shown
 * to the student, to peers, or to admins. Class ownership and class membership
 * are asserted before the validation runs, and the policy adds the feature-flag
 * and role check.
 */
class NoteController extends Controller
{
    public function __construct(private readonly ClassAccessService $access) {}

    public function store(Request $request, int $class, int $student): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertStudentInClassForClass($instructor, $class, $student);

        Gate::authorize('create', InstructorNote::class);

        /** @var array{note:string} $data */
        $data = $request->validate([
            'note' => ['required', 'string', 'max:4000'],
        ]);

        InstructorNote::query()->create([
            'class_id' => $class,
            'student_id' => $student,
            'instructor_id' => $instructor->getKey(),
            'note' => $data['note'],
        ]);

        return back()->with('success', 'Note saved. Only you can see it.');
    }
}
