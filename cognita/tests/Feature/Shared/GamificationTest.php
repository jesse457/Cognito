<?php

declare(strict_types=1);

namespace Tests\Feature\Shared;

use App\Models\Achievement;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\KnowledgeComponent;
use App\Models\LeaderboardEntry;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\ParticipantProfile;
use App\Models\PracticeSession;
use App\Models\User;
use App\Services\GamificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature test 17 — gamification on quiz completion.
 */
class GamificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_completing_a_quiz_awards_xp_updates_the_streak_and_creates_a_leaderboard_entry(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->getKey(), 'course_id' => $course->getKey()]);

        $module = Module::factory()->create(['course_id' => $course->getKey(), 'sequence_order' => 1]);
        $lesson = Lesson::factory()->create(['module_id' => $module->getKey(), 'sequence_order' => 1]);

        Achievement::query()->create([
            'slug' => 'first_quiz',
            'name' => 'First Quiz',
            'description' => 'Complete your first quiz.',
            'criteria' => ['type' => 'quiz_completed', 'count' => 1],
        ]);

        $session = PracticeSession::query()->create([
            'user_id' => $student->getKey(),
            'course_id' => $course->getKey(),
            'lesson_id' => $lesson->getKey(),
            'started_at' => now(),
        ]);

        $session->answers()->create([
            'user_id' => $student->getKey(),
            'lesson_id' => $lesson->getKey(),
            'knowledge_component_id' => KnowledgeComponent::factory()->create(['course_id' => $course->getKey()])->getKey(),
            'question_payload' => ['id' => 'q1'],
            'user_answer' => ['selected_option_index' => 0],
            'is_correct' => true,
            'time_taken_ms' => 900,
        ]);

        $this->actingAs($student)
            ->postJson("/api/practice-sessions/{$session->getKey()}/complete")
            ->assertOk();

        $profile = ParticipantProfile::query()->where('user_id', $student->getKey())->firstOrFail();

        // 1 correct answer (10 XP) + quiz completion bonus (50 XP)
        $this->assertSame(60, $profile->total_xp);
        $this->assertSame(1, $profile->current_streak);
        $this->assertSame(1, $profile->current_level);
        $this->assertNotNull($profile->last_activity_date);

        $this->assertDatabaseHas('leaderboard_entries', [
            'user_id' => $student->getKey(),
            'course_id' => $course->getKey(),
            'period' => 'all_time',
            'score' => 60,
        ]);
        $this->assertDatabaseHas('leaderboard_entries', [
            'user_id' => $student->getKey(),
            'course_id' => $course->getKey(),
            'period' => 'weekly',
            'score' => 60,
        ]);

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $student->getKey(),
            'achievement_id' => Achievement::query()->where('slug', 'first_quiz')->value('id'),
        ]);
    }

    public function test_a_seven_day_streak_unlocks_the_streak_achievement(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Achievement::query()->create([
            'slug' => 'seven_day_streak',
            'name' => 'Seven Day Streak',
            'description' => 'Practise seven days in a row.',
            'criteria' => ['type' => 'streak', 'days' => 7],
        ]);

        $profile = ParticipantProfile::query()->create([
            'user_id' => $student->getKey(),
            'total_xp' => 100,
            'current_level' => 1,
            'current_streak' => 6,
            'last_activity_date' => now()->subDay()->toDateString(),
        ]);

        $service = app(GamificationService::class);
        $service->awardQuizCompletion($student, $course, 3, 5);

        $this->assertSame(7, $profile->refresh()->current_streak);
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $student->getKey(),
            'achievement_id' => Achievement::query()->where('slug', 'seven_day_streak')->value('id'),
        ]);
    }

    public function test_leaderboard_ranks_are_recomputed_from_scores(): void
    {
        $course = Course::factory()->create();
        $first = User::factory()->create();
        $second = User::factory()->create();

        LeaderboardEntry::query()->create([
            'course_id' => $course->getKey(), 'user_id' => $first->getKey(),
            'score' => 50, 'period' => 'all_time',
        ]);
        LeaderboardEntry::query()->create([
            'course_id' => $course->getKey(), 'user_id' => $second->getKey(),
            'score' => 120, 'period' => 'all_time',
        ]);

        app(GamificationService::class)->syncLeaderboardRanks();

        $this->assertSame(1, LeaderboardEntry::query()
            ->where('user_id', $second->getKey())->where('period', 'all_time')->value('rank'));
        $this->assertSame(2, LeaderboardEntry::query()
            ->where('user_id', $first->getKey())->where('period', 'all_time')->value('rank'));
    }
}
