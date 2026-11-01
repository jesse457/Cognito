<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Enums\LeaderboardPeriod;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\LeaderboardEntry;
use App\Models\User;
use App\Services\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    public function __construct(private readonly GamificationService $gamification) {}

    public function profile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $this->gamification->summary($user)]);
    }

    public function leaderboard(Request $request, Course $course): JsonResponse
    {
        $period = LeaderboardPeriod::tryFrom((string) $request->input('period', LeaderboardPeriod::AllTime->value))
            ?? LeaderboardPeriod::AllTime;

        $entries = LeaderboardEntry::query()
            ->where('course_id', $course->getKey())
            ->where('period', $period->value)
            ->with('user:id,name,display_name')
            ->orderByDesc('score')
            ->orderBy('user_id')
            ->limit(100)
            ->get()
            ->values()
            ->map(fn (LeaderboardEntry $entry, int $index): array => [
                'rank' => $entry->rank ?? $index + 1,
                'user_id' => $entry->user_id,
                'name' => $entry->user?->displayLabel(),
                'score' => $entry->score,
            ])
            ->all();

        return response()->json([
            'data' => $entries,
            'meta' => ['course_id' => $course->getKey(), 'period' => $period->value],
        ]);
    }
}
