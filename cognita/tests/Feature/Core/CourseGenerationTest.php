<?php

declare(strict_types=1);

namespace Tests\Feature\Core;

use App\Ai\Agents\CourseGenerationAgent;
use App\Models\Course;
use App\Models\KnowledgeComponent;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Services\CourseGenerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature test 1 — course generation from retrieved chunks.
 */
class CourseGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_course_with_modules_and_lessons_is_generated_from_source_chunks(): void
    {
        $admin = User::factory()->admin()->create();

        CourseGenerationAgent::fake([[
            'title' => 'Cell Biology Foundations',
            'description' => 'An AI-authored introduction to cell biology.',
            'modules' => [
                [
                    'title' => 'Cell Structure',
                    'knowledge_components' => ['Cell Membrane', 'Organelles'],
                    'lessons' => [
                        [
                            'title' => 'The Plasma Membrane',
                            'content_type' => 'text',
                            'content_body' => 'The plasma membrane is a phospholipid bilayer.',
                        ],
                        [
                            'title' => 'Inside the Cell',
                            'content_type' => 'text',
                            'content_body' => 'Organelles compartmentalise cellular chemistry.',
                        ],
                    ],
                ],
            ],
        ]]);

        $course = app(CourseGenerationService::class)->generate(
            ['Cells are the basic unit of life. The plasma membrane is a bilayer.'],
            $admin,
            'Cell Biology',
        );

        $this->assertInstanceOf(Course::class, $course);
        $this->assertDatabaseHas('courses', [
            'id' => $course->getKey(),
            'title' => 'Cell Biology Foundations',
            'created_by' => $admin->getKey(),
            'is_ai_generated' => true,
        ]);

        $this->assertSame(1, Module::query()->where('course_id', $course->getKey())->count());
        $this->assertSame(2, Lesson::query()->count());
        $this->assertSame(2, KnowledgeComponent::query()->where('course_id', $course->getKey())->count());

        $lesson = Lesson::query()->where('title', 'The Plasma Membrane')->firstOrFail();
        $this->assertGreaterThanOrEqual(1, $lesson->knowledgeComponents()->count());
        $this->assertGreaterThanOrEqual(1, $lesson->sequence_order);
    }

    public function test_generation_requires_source_material(): void
    {
        $admin = User::factory()->admin()->create();

        $this->expectException(\RuntimeException::class);

        app(CourseGenerationService::class)->generate([], $admin, 'Nothing');
    }
}
