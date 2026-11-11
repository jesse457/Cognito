<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\User;
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
        $this->assertOwnRecord($request->user(), $classroom, $attendance);

        $this->attendance->ping($attendance);

        return response()->json([
            'data' => ['last_seen_at' => $attendance->last_seen_at?->toIso8601String()],
        ]);
    }

    public function leave(Request $request, Classroom $classroom, AttendanceRecord $attendance): JsonResponse
    {
        $this->assertOwnRecord($request->user(), $classroom, $attendance);

        $this->attendance->leave($attendance);

        return response()->json(['data' => ['left_at' => $attendance->left_at?->toIso8601String()]]);
    }

    private function assertOwnRecord(?User $user, Classroom $classroom, AttendanceRecord $attendance): void
    {
        abort_if($user === null, 401);
        abort_unless((int) $attendance->classroom_id === (int) $classroom->getKey(), 404);
        abort_unless((int) $attendance->user_id === (int) $user->getKey(), 403);
    }
}
