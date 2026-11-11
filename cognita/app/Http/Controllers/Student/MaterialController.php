<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\ClassDocument;
use App\Models\User;
use App\Services\ClassroomAccess;
use App\Support\HumanTime;
use Illuminate\Http\Request;
use Illuminate\Support\Number;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every PDF kept in the classes a student has joined.
 *
 * The library is the same one the live board presents from: a deck uploaded in
 * a call stays attached to the class, and this page makes it readable between
 * calls without joining a room.
 */
class MaterialController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
    ) {}

    public function index(Request $request): Response
    {
        /** @var User $student */
        $student = $request->user();

        $classrooms = $this->access->forStudent($student);
        $ids = $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $term = trim((string) $request->query('q', ''));

        $documents = ClassDocument::query()
            ->whereIn('classroom_id', $ids)
            ->with(['classroom:id,name,course_id', 'classroom.course:id,title'])
            ->when($term !== '', fn ($query) => $query->whereLike('name', '%'.$term.'%', caseSensitive: false))
            ->latest()
            ->get();

        return Inertia::render('Student/Materials', [
            'filters' => ['q' => $term],
            'stats' => [
                'documents' => $documents->count(),
                'classes' => $documents->pluck('classroom_id')->unique()->count(),
                'pages' => (int) $documents->sum('pages'),
                'size' => Number::fileSize((int) $documents->sum('size')),
            ],
            'documents' => $documents
                ->map(static fn (ClassDocument $document): array => [
                    'id' => (int) $document->getKey(),
                    'name' => $document->name,
                    'pages' => max(1, (int) $document->pages),
                    'size' => Number::fileSize((int) $document->size),
                    'classroom' => (string) $document->classroom?->name,
                    'classroom_id' => (int) $document->classroom_id,
                    'course' => $document->classroom?->course?->title,
                    'added' => HumanTime::ago($document->created_at),
                    'url' => route('board.documents.show', [
                        'classroom' => $document->classroom_id,
                        'document' => $document->getKey(),
                    ]),
                    'class_url' => route('student.classes.show', ['classroom' => $document->classroom_id]),
                ])
                ->values()
                ->all(),
        ]);
    }
}
