<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Services\AttendanceTracker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Browser heartbeats for the automatic attendance record created at join time.
 */
class CallAttendanceController extends Controller
{
    public function __construct(private readonly AttendanceTracker $attendance) {}

    public function ping(Request $request, Classroom $classroom, AttendanceRecord $attendance): JsonResponse
    {
        $this->authorize('ping', $attendance);
        abort_unless((int) $attendance->classroom_id === (int) $classroom->getKey(), 404);

        $this->attendance->ping($attendance);

        return response()->json([
            'data' => ['last_seen_at' => $attendance->last_seen_at?->toIso8601String()],
        ]);
    }

    public function leave(Request $request, Classroom $classroom, AttendanceRecord $attendance): JsonResponse
    {
        $this->authorize('leave', $attendance);
        abort_unless((int) $attendance->classroom_id === (int) $classroom->getKey(), 404);

        $this->attendance->leave($attendance);

        return response()->json(['data' => ['left_at' => $attendance->left_at?->toIso8601String()]]);
    }
}
