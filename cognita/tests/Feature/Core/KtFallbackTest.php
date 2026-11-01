<?php

declare(strict_types=1);

namespace Tests\Feature\Core;

use App\Jobs\UpdateStudentMastery;
use App\Models\Course;
use App\Models\KnowledgeComponent;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\PracticeSession;
use App\Models\StudentKcMastery;
use App\Models\User;
use App\Services\KnowledgeTracing\BktEstimator;
use App\Services\KnowledgeTracing\KtClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Feature test 4 — graceful degradation when the Python KT service is down.
 */
class KtFallbackTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private Course $course;

    private KnowledgeComponent $component;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
        $student = $this->student;
        $this->course = Course::factory()->create();
        $course = $this->course;

        $module = Module::factory()->create(['course_id' => $course->getKey(), 'sequence_order' => 1]);
        $lesson = Lesson::factory()->create(['module_id' => $module->getKey(), 'sequence_order' => 1]);

        $this->component = KnowledgeComponent::factory()->create(['course_id' => $course->getKey()]);
        $lesson->knowledgeComponents()->attach($this->component->getKey());

        $session = PracticeSession::query()->create([
            'user_id' => $student->getKey(),
            'course_id' => $course->getKey(),
            'lesson_id' => $lesson->getKey(),
            'started_at' => now(),
        ]);

        $session->answers()->create([
            'user_id' => $student->getKey(),
            'lesson_id' => $lesson->getKey(),
            'knowledge_component_id' => $this->component->getKey(),
            'question_payload' => ['id' => 'q1'],
            'user_answer' => ['selected_option_index' => 0],
            'is_correct' => true,
            'time_taken_ms' => 1000,
        ]);
    }

    public function test_a_500_from_the_kt_service_falls_back_to_local_bkt(): void
    {
        Log::spy();
        Http::fake(['*' => Http::response(['detail' => 'boom'], 500)]);

        $this->runJob();

        $mastery = $this->assertMasteryWritten();
        $this->assertSame('bkt', $mastery->model_used->value);
        $this->assertGreaterThan(0.0, (float) $mastery->mastery_probability);
        $this->assertLessThanOrEqual(1.0, (float) $mastery->mastery_probability);

        Log::shouldHaveReceived('warning')
            ->withArgs(fn (string $message): bool => str_contains($message, 'kt.service_unavailable_falling_back_to_bkt'))
            ->atLeast()->once();
    }

    public function test_an_unreachable_kt_service_falls_back_to_local_bkt_without_throwing(): void
    {
        Http::fake(function (): never {
            throw new ConnectionException('Connection refused (kt-service.test:8001)');
        });

        $this->runJob();

        $mastery = $this->assertMasteryWritten();
        $this->assertSame('bkt', $mastery->model_used->value);
    }

    public function test_an_empty_service_payload_also_degrades_to_bkt(): void
    {
        Http::fake(['*' => Http::response(['mastery' => [], 'engine' => 'bkt'], 200)]);

        $this->runJob();

        $this->assertSame('bkt', $this->assertMasteryWritten()->model_used->value);
    }

    private function runJob(): void
    {
        (new UpdateStudentMastery(
            $this->student->getKey(),
            [$this->component->getKey()],
            $this->course->getKey(),
        ))->handle(app(KtClient::class), app(BktEstimator::class));
    }

    private function assertMasteryWritten(): StudentKcMastery
    {
        return StudentKcMastery::query()
            ->where('user_id', $this->student->getKey())
            ->where('knowledge_component_id', $this->component->getKey())
            ->firstOrFail();
    }
}
