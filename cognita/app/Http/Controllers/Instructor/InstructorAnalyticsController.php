<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Resources\Instructor\InstructorPayloadResource;
use App\Models\User;
use App\Services\AtRiskDetectionService;
use App\Services\ClassAccessService;
use App\Services\CohortAnalyticsService;
use App\Services\StudentProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Cohort analytics: heatmap, at-risk list, on-demand snapshot.
 *
 * "Snapshot" here always means the persisted analytics snapshot. Mastery itself
 * is produced by the KT engine — this portal only reads `student_kc_mastery`.
 */
class InstructorAnalyticsController extends Controller
{
    public function __construct(
        private readonly ClassAccessService $access,
        private readonly CohortAnalyticsService $cohortAnalytics,
        private readonly AtRiskDetectionService $atRisk,
        private readonly StudentProgressService $progress,
    ) {}

    public function heatmap(Request $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        $payload = $this->cohortAnalytics->heatmap($instructor, $class);
        $payload['kc_breakdown'] = $this->progress->kcBreakdown($instructor, $class)['rows'];

        return response()->json(new InstructorPayloadResource($payload));
    }

    public function atRisk(Request $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        $students = $this->atRisk->atRiskStudents($instructor, $class);

        return response()->json(new InstructorPayloadResource([
            'class_id' => $class,
            'threshold' => (float) config('features.at_risk_threshold'),
            'students' => $students,
        ]));
    }

    public function snapshot(Request $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        $snapshot = $this->cohortAnalytics->snapshot($instructor, $class);

        if ($snapshot === null) {
            abort(403, 'The instructor portal is disabled.');
        }

        return response()->json(new InstructorPayloadResource([
            'id' => (int) $snapshot->getKey(),
            'class_id' => (int) $snapshot->class_id,
            'snapshot_date' => $snapshot->snapshot_date?->toDateString(),
            'metrics' => $snapshot->metrics ?? [],
        ]), 201);
    }
}
