<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Resources\Instructor\InstructorPayloadResource;
use App\Models\User;
use App\Services\ClassBriefingAgent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AI class briefing with suggested interventions.
 *
 * The agent never throws on provider failure; it falls back to a deterministic
 * rule-based briefing so the dashboard stays usable offline.
 */
class InstructorBriefingController extends Controller
{
    public function __construct(private readonly ClassBriefingAgent $briefingAgent) {}

    public function show(Request $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $briefing = $this->briefingAgent->briefing($instructor, $class);

        return response()->json(new InstructorPayloadResource($briefing + ['class_id' => $class]));
    }
}
