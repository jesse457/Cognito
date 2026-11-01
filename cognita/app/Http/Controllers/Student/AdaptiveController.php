<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdaptiveContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdaptiveController extends Controller
{
    public function __construct(private readonly AdaptiveContentService $adaptive) {}

    /**
     * Targeted remediation for the authenticated student's weakest concepts.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $courseId = $request->filled('course_id') ? $request->integer('course_id') : null;

        return response()->json(['data' => $this->adaptive->recommendations($user, $courseId)]);
    }
}
