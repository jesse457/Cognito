<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Resources\Instructor\InstructorPayloadResource;
use App\Models\User;
use App\Services\ClassDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Portal landing page and per-class KPI dashboard.
 *
 * Every payload is produced by ClassDashboardService, which scopes through
 * ClassAccessService — a foreign class id therefore yields 403, not data.
 */
class InstructorDashboardController extends Controller
{
    public function __construct(private readonly ClassDashboardService $dashboard) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $payload = $this->dashboard->forInstructor($instructor);

        return response()->json(new InstructorPayloadResource($payload));
    }

    public function show(Request $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $payload = $this->dashboard->forClass($instructor, $class);

        return response()->json(new InstructorPayloadResource($payload));
    }
}
