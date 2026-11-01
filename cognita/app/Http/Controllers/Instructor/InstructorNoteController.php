<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Instructor\StoreInstructorNoteRequest;
use App\Http\Resources\Instructor\InstructorNoteResource;
use App\Models\InstructorNote;
use App\Models\User;
use App\Services\ClassAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * Private instructor notes about a student.
 *
 * Visibility is deliberately narrow: a note is readable/deletable only by its
 * authoring instructor (InstructorNotePolicy). Endpoints are bound by id and
 * authorize in this order — class ownership, student membership, then the note
 * policy — so an existing note belonging to another instructor is a 403 and a
 * missing note is a 404.
 */
class InstructorNoteController extends Controller
{
    public function __construct(private readonly ClassAccessService $access) {}

    public function index(Request $request, int $class, int $student): AnonymousResourceCollection
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertStudentInClassForClass($instructor, $class, $student);

        $notes = InstructorNote::query()
            ->where('class_id', $class)
            ->where('student_id', $student)
            ->where('instructor_id', $instructor->getKey())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return InstructorNoteResource::collection($notes)
            ->additional(['meta' => ['total' => $notes->count()]]);
    }

    public function store(StoreInstructorNoteRequest $request, int $class, int $student): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertStudentInClassForClass($instructor, $class, $student);

        Gate::authorize('create', InstructorNote::class);

        $note = InstructorNote::query()->create([
            'class_id' => $class,
            'student_id' => $student,
            'instructor_id' => $instructor->getKey(),
            'note' => (string) $request->validated('note'),
        ]);

        return (new InstructorNoteResource($note))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, int $class, int $note): JsonResponse
    {
        $model = $this->resolveNote($request, $class, $note);

        return (new InstructorNoteResource($model))->response();
    }

    public function destroy(Request $request, int $class, int $note): JsonResponse
    {
        $model = $this->resolveNote($request, $class, $note);

        $id = (int) $model->getKey();
        $model->delete();

        return response()->json(['data' => ['deleted' => true, 'id' => $id]]);
    }

    private function resolveNote(Request $request, int $class, int $noteId): InstructorNote
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        $note = InstructorNote::query()->find($noteId);

        if ($note === null) {
            abort(404, 'Note not found.');
        }

        Gate::authorize($request->isMethod('delete') ? 'delete' : 'view', $note);

        if ((int) $note->class_id !== $class) {
            abort(404, 'Note not found.');
        }

        return $note;
    }
}
