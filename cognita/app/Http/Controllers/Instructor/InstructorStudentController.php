<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Resources\Instructor\InstructorPayloadResource;
use App\Http\Resources\Instructor\InstructorStudentResource;
use App\Models\User;
use App\Services\ClassAccessService;
use App\Services\StudentProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Roster and per-student mastery drill-down.
 *
 * Both endpoints route through ClassAccessService, so a student outside the
 * instructor's active classes is 403 even though the id exists.
 */
class InstructorStudentController extends Controller
{
    public function __construct(
        private readonly ClassAccessService $access,
        private readonly StudentProgressService $progress,
    ) {}

    public function index(Request $request, int $class): AnonymousResourceCollection
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $payload = $this->progress->forClass($instructor, $class);

        /** @var list<array<string, mixed>> $rows */
        $rows = $payload['students'];

        $students = array_map(static function (array $row): User {
            $student = new User;
            $student->forceFill([
                'id' => $row['id'],
                'name' => $row['name'],
                'display_name' => $row['name'],
                'email' => $row['email'],
            ]);

            $student->setAttribute('avg_mastery', $row['avg_mastery']);
            $student->setAttribute('at_risk', $row['at_risk']);
            $student->setAttribute('kc_count', $row['kc_count']);

            return $student;
        }, $rows);

        return InstructorStudentResource::collection($students)
            ->additional(['meta' => [
                'total' => count($students),
                'class' => $payload['class'],
            ]]);
    }

    public function show(Request $request, int $class, int $student): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertStudentInClassForClass($instructor, $class, $student);

        $payload = $this->progress->drillDown($instructor, $student);

        return response()->json(new InstructorPayloadResource($payload));
    }
}
