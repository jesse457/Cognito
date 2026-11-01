<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\LeaderboardPeriod;
use App\Models\Achievement;
use App\Models\AnswerHistory;
use App\Models\Course;
use App\Models\LeaderboardEntry;
use App\Models\ParticipantProfile;
use App\Models\User;
use App\Models\UserAchievement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * XP, streaks, levels, leaderboards and achievements.
 *
 * Called from event listeners (QuizCompleted) so HTTP requests stay fast. All
 * writes are idempotent/idempotent-ish by construction: the profile is
 * firstOrCreate'd, leaderboard rows are updateOrCreate'd on the unique
 * (course_id, user_id, period) key, and achievements use firstOrCreate.
 */
class GamificationService
{
    public function awardQuizCompletion(User $user, ?Course $course, int $correctCount = 0, int $totalCount = 0): ParticipantProfile
    {
        $profile = $this->profileFor($user);

        $xp = ($correctCount * (int) config('cognita.gamification.xp_per_correct_answer', 10))
            + (int) config('cognita.gamification.xp_per_quiz_completion', 50);

        DB::transaction(function () use ($profile, $user, $course, $xp): void {
            $this->applyActivity($profile, $xp);

            if ($course !== null) {
                $this->creditLeaderboard($user, $course, $xp, LeaderboardPeriod::Weekly);
                $this->creditLeaderboard($user, $course, $xp, LeaderboardPeriod::AllTime);
            }

            $this->evaluateAchievements($user, $profile);
        });

        Log::info('gamification.quiz_awarded', [
            'user_id' => $user->getKey(),
            'course_id' => $course?->getKey(),
            'xp_awarded' => $xp,
            'total_xp' => $profile->refresh()->total_xp,
            'current_streak' => $profile->current_streak,
            'current_level' => $profile->current_level,
            'correct_count' => $correctCount,
            'total_count' => $totalCount,
        ]);

        return $profile;
    }

    public function profileFor(User $user): ParticipantProfile
    {
        return ParticipantProfile::query()->firstOrCreate(
            ['user_id' => $user->getKey()],
            [
                'total_xp' => 0,
                'current_level' => 1,
                'current_streak' => 0,
                'last_activity_date' => null,
            ],
        );
    }

    /**
     * Recompute `rank` for every leaderboard row of a period.
     *
     * @return int number of ranked rows
     */
    public function syncLeaderboardRanks(?LeaderboardPeriod $period = null): int
    {
        $periods = $period === null ? LeaderboardPeriod::cases() : [$period];
        $ranked = 0;

        foreach ($periods as $currentPeriod) {
            $courseIds = LeaderboardEntry::query()
                ->where('period', $currentPeriod->value)
                ->distinct()
                ->pluck('course_id');

            foreach ($courseIds as $courseId) {
                $position = 1;

                $entries = LeaderboardEntry::query()
                    ->where('course_id', $courseId)
                    ->where('period', $currentPeriod->value)
                    ->orderByDesc('score')
                    ->orderBy('user_id')
                    ->get();

                foreach ($entries as $entry) {
                    $entry->forceFill(['rank' => $position])->save();
                    $position++;
                    $ranked++;
                }
            }
        }

        return $ranked;
    }

    /** @return array<string, mixed> */
    public function summary(User $user): array
    {
        $profile = $this->profileFor($user);
        $nextLevelXp = (int) config('cognita.gamification.xp_per_level', 500);

        return [
            'total_xp' => $profile->total_xp,
            'current_level' => $profile->current_level,
            'current_streak' => $profile->current_streak,
            'last_activity_date' => $profile->last_activity_date?->toDateString(),
            'xp_to_next_level' => max(0, ($profile->current_level * $nextLevelXp) - $profile->total_xp),
            'achievements' => $user->achievements()->get()->map(fn (Achievement $achievement): array => [
                'slug' => $achievement->slug,
                'name' => $achievement->name,
                'earned_at' => $achievement->pivot?->earned_at,
            ])->values()->all(),
        ];
    }

    /**
     * XP + level + streak bookkeeping for one activity.
     */
    private function applyActivity(ParticipantProfile $profile, int $xp): void
    {
        $today = now()->toDateString();
        $lastActivity = $profile->last_activity_date?->toDateString();

        if ($lastActivity === null) {
            $profile->current_streak = 1;
        } elseif ($lastActivity !== $today) {
            $profile->current_streak = $profile->last_activity_date->copy()->addDay()->toDateString() === $today
                ? $profile->current_streak + 1
                : 1;
        }

        $profile->last_activity_date = $today;
        $profile->total_xp += $xp;

        $xpPerLevel = max(1, (int) config('cognita.gamification.xp_per_level', 500));
        $profile->current_level = intdiv($profile->total_xp, $xpPerLevel) + 1;

        $profile->save();
    }

    private function creditLeaderboard(User $user, Course $course, int $xp, LeaderboardPeriod $period): void
    {
        $entry = LeaderboardEntry::query()->firstOrNew([
            'course_id' => $course->getKey(),
            'user_id' => $user->getKey(),
            'period' => $period->value,
        ]);

        $entry->score = (int) ($entry->score ?? 0) + $xp;
        $entry->save();
    }

    /** @return list<string> newly earned achievement slugs */
    private function evaluateAchievements(User $user, ParticipantProfile $profile): array
    {
        $earned = [];

        $quizCount = AnswerHistory::query()
            ->where('user_id', $user->getKey())
            ->distinct()
            ->count('session_id');

        $candidates = [
            'first_quiz' => $quizCount >= 1,
            'seven_day_streak' => $profile->current_streak >= 7,
        ];

        foreach ($candidates as $slug => $satisfied) {
            if (! $satisfied) {
                continue;
            }

            $achievement = Achievement::query()->where('slug', $slug)->first();

            if ($achievement === null) {
                continue;
            }

            $award = UserAchievement::query()->firstOrCreate(
                ['user_id' => $user->getKey(), 'achievement_id' => $achievement->getKey()],
                ['earned_at' => now()],
            );

            if ($award->wasRecentlyCreated) {
                $earned[] = $slug;
            }
        }

        if ($earned !== []) {
            Log::info('gamification.achievements_earned', [
                'user_id' => $user->getKey(),
                'achievements' => $earned,
            ]);
        }

        return $earned;
    }
}
