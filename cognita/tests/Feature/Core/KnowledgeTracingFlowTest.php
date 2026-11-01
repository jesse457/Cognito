<?php

declare(strict_types=1);

namespace Tests\Feature\Core;

use App\Jobs\UpdateStudentMastery;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\KnowledgeComponent;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\PracticeSession;
use App\Models\StudentKcMastery;
use App\Models\User;
use App\Services\KnowledgeTracing\BktEstimator;
use App\Services\KnowledgeTracing\KtClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Feature test 3 — the quiz → answer → knowledge-tracing flow.
 */
class KnowledgeTracingFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private Course $course;

    private Lesson $lesson;

    private KnowledgeComponent $component;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
        $student = $this->student;
        $this->course = Course::factory()->create();
        $course = $this->course;

        $module = Module::factory()->create(['course_id' => $course->getKey(), 'sequence_order' => 1]);
        $this->lesson = Lesson::factory()->create([
            'module_id' => $module->getKey(),
            'content_type' => 'quiz',
            'sequence_order' => 1,
        ]);
        $this->component = KnowledgeComponent::factory()->create(['course_id' => $course->getKey()]);
        $this->lesson->knowledgeComponents()->attach($this->component->getKey());

        Enrollment::factory()->create([
            'user_id' => $student->getKey(),
            'course_id' => $course->getKey(),
        ]);
    }

    public function test_submitting_an_answer_dispatches_the_mastery_job(): void
    {
        Queue::fake();

        $sessionId = $this->actingAs($this->student)
            ->postJson('/api/practice-sessions', [
                'course_id' => $this->course->getKey(),
                'lesson_id' => $this->lesson->getKey(),
            ])
            ->assertCreated()
            ->json('data.session_id');

        $this->actingAs($this->student)
            ->postJson("/api/practice-sessions/{$sessionId}/answers", [
                'question_payload' => ['id' => 'q1', 'correct_option_index' => 1],
                'user_answer' => ['selected_option_index' => 1],
                'time_taken_ms' => 4200,
            ])
            ->assertCreated()
            ->assertJsonPath('data.is_correct', true);

        Queue::assertPushed(UpdateStudentMastery::class, function (UpdateStudentMastery $job): bool {
            return $job->userId === $this->student->getKey()
                && in_array($this->component->getKey(), $job->knowledgeComponentIds, true);
        });

        $this->assertDatabaseCount('answer_history', 1);
        $this->assertDatabaseHas('answer_history', [
            'user_id' => $this->student->getKey(),
            'knowledge_component_id' => $this->component->getKey(),
            'is_correct' => true,
        ]);
    }

    public function test_the_mastery_job_writes_mastery_with_the_bkt_engine(): void
    {
        $this->seedAnswers(correct: 2, incorrect: 1);

        Http::fake([
            '*/predict_mastery' => Http::response([
                'mastery' => [
                    ['kc_id' => $this->component->getKey(), 'probability' => 0.7312],
                ],
                'engine' => 'bkt',
            ], 200),
        ]);

        (new UpdateStudentMastery(
            $this->student->getKey(),
            [$this->component->getKey()],
            $this->course->getKey(),
        ))->handle(app(KtClient::class), app(BktEstimator::class));

        $mastery = StudentKcMastery::query()
            ->where('user_id', $this->student->getKey())
            ->where('knowledge_component_id', $this->component->getKey())
            ->firstOrFail();

        $this->assertSame('bkt', $mastery->model_used->value);
        $this->assertEqualsWithDelta(0.7312, (float) $mastery->mastery_probability, 0.0001);
        $this->assertNotNull($mastery->last_updated);

        Http::assertSent(function ($request): bool {
            return str_contains($request->url(), '/predict_mastery')
                && $request['user_id'] === $this->student->getKey()
                && is_array($request['history'])
                && count($request['history']) === 3;
        });
    }

    public function test_completing_a_quiz_dispatches_quiz_completed_side_effects(): void
    {
        $session = $this->startPracticeSession();
        $session->answers()->create([
            'user_id' => $this->student->getKey(),
            'lesson_id' => $this->lesson->getKey(),
            'knowledge_component_id' => $this->component->getKey(),
            'question_payload' => ['id' => 'q1'],
            'user_answer' => ['selected_option_index' => 0],
            'is_correct' => true,
            'time_taken_ms' => 1500,
        ]);

        $this->actingAs($this->student)
            ->postJson("/api/practice-sessions/{$session->getKey()}/complete")
            ->assertOk()
            ->assertJsonPath('data.correct_count', 1)
            ->assertJsonPath('data.total_count', 1);

        $this->assertNotNull($session->refresh()->completed_at);

        // The completion path awarded gamification XP (listener side effect).
        $this->assertDatabaseHas('participant_profiles', ['user_id' => $this->student->getKey()]);
    }

    public function startPracticeSession(): PracticeSession
    {
        return PracticeSession::query()->create([
            'user_id' => $this->student->getKey(),
            'course_id' => $this->course->getKey(),
            'lesson_id' => $this->lesson->getKey(),
            'started_at' => now(),
        ]);
    }

    private function seedAnswers(int $correct, int $incorrect): void
    {
        $session = $this->startPracticeSession();

        for ($i = 0; $i < $correct; $i++) {
            $session->answers()->create([
                'user_id' => $this->student->getKey(),
                'lesson_id' => $this->lesson->getKey(),
                'knowledge_component_id' => $this->component->getKey(),
                'question_payload' => ['id' => 'c'.$i],
                'user_answer' => ['selected_option_index' => 0],
                'is_correct' => true,
                'time_taken_ms' => 1200,
            ]);
        }

        for ($i = 0; $i < $incorrect; $i++) {
            $session->answers()->create([
                'user_id' => $this->student->getKey(),
                'lesson_id' => $this->lesson->getKey(),
                'knowledge_component_id' => $this->component->getKey(),
                'question_payload' => ['id' => 'w'.$i],
                'user_answer' => ['selected_option_index' => 1],
                'is_correct' => false,
                'time_taken_ms' => 2400,
            ]);
        }
    }
}
