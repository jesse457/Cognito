<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Instructor\StoreClassRequest;
use App\Http\Requests\Instructor\UpdateClassRequest;
use App\Http\Resources\Instructor\InstructorClassResource;
use App\Models\PrivateClass;
use App\Models\User;
use App\Services\ClassAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * CRUD over the instructor's own private classes.
 *
 * Route parameters are resolved through ClassAccessService (not implicit model
 * binding) so a class id belonging to another instructor is a 403, and a
 * non-existent id a 404, before any payload is built.
 */
class InstructorClassController extends Controller
{
    public function __construct(private readonly ClassAccessService $access) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $classes = $this->access
            ->classesFor($instructor)
            ->load('instructor:id,name,display_name');

        return InstructorClassResource::collection($classes)
            ->additional(['meta' => ['total' => $classes->count()]]);
    }

    public function store(StoreClassRequest $request): JsonResponse
    {
        Gate::authorize('create', PrivateClass::class);

        /** @var User $instructor */
        $instructor = $request->user();

        /** @var array{name:string, description?:string|null, max_students?:int|null} $data */
        $data = $request->validated();

        $class = PrivateClass::query()->create([
            'instructor_id' => $instructor->getKey(),
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'max_students' => $data['max_students'] ?? (int) config('features.max_class_size'),
        ]);

        return (new InstructorClassResource($class))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $model = $this->access->assertInstructorOwnsClass($instructor, $class);

        Gate::authorize('view', $model);

        $model->load('instructor:id,name,display_name');

        return (new InstructorClassResource($model))->response();
    }

    public function update(UpdateClassRequest $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $model = $this->access->assertInstructorOwnsClass($instructor, $class);

        Gate::authorize('update', $model);

        /** @var array{name?:string, description?:string|null, max_students?:int, status?:string} $data */
        $data = $request->validated();

        $model->fill($data);
        $model->save();

        return (new InstructorClassResource($model->refresh()))
            ->response();
    }

    public function destroy(Request $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $model = $this->access->assertInstructorOwnsClass($instructor, $class);

        Gate::authorize('delete', $model);

        $model->delete();

        return response()->json(['data' => ['deleted' => true, 'id' => (int) $model->getKey()]]);
    }
}
