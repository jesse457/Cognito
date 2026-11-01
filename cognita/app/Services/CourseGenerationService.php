<?php

declare(strict_types=1);

namespace App\Services;

use App\Ai\Agents\CourseGenerationAgent;
use App\Enums\ContentType;
use App\Enums\CourseStatus;
use App\Models\Course;
use App\Models\KnowledgeComponent;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Turns retrieved chunks into a persisted Course → Modules → Lessons tree with
 * its knowledge components and lesson/KC mapping.
 *
 * Runs inside a queued job; provider failures are re-thrown so the queue can
 * retry with backoff (the student flow never calls this synchronously).
 */
class CourseGenerationService
{
    /**
     * @param  list<string>  $sourceMaterial
     */
    public function generate(array $sourceMaterial, User $actor, string $titleHint = ''): Course
    {
        if ($sourceMaterial === []) {
            throw new RuntimeException('Course generation requires at least one source chunk.');
        }

        $agent = new CourseGenerationAgent($sourceMaterial);
        $prompt = trim(implode("\n", array_filter([
            $titleHint !== '' ? "Working title / topic: {$titleHint}" : null,
            'Author the course from the source material below.',
            "\n<source_material>\n".$agent->sourceContext()."\n</source_material>",
        ])));

        $response = $agent->prompt($prompt);
        $draft = $this->normaliseDraft($this->structuredPayload($response));

        $course = DB::transaction(fn (): Course => $this->persist($draft, $actor));

        Log::info('rag.course_generated', [
            'course_id' => $course->getKey(),
            'created_by' => $actor->getKey(),
            'modules' => $course->modules()->count(),
            'lessons' => $course->lessons()->count(),
            'knowledge_components' => $course->knowledgeComponents()->count(),
            'source_chunks' => count($sourceMaterial),
        ]);

        return $course->load('modules.lessons', 'knowledgeComponents');
    }

    /**
     * @return array{title:string, description:string, modules:list<array{title:string, knowledge_components:list<string>, lessons:list<array{title:string, content_type:string, content_body:string}>}>}
     */
    private function structuredPayload(mixed $response): array
    {
        $structured = $response->structured ?? null;

        if (is_array($structured)) {
            return $structured;
        }

        $text = (string) ($response->text ?? '');
        $decoded = json_decode($text, true);

        if (! is_array($decoded)) {
            throw new RuntimeException('The AI provider returned an unusable course draft.');
        }

        return $decoded;
    }

    /**
     * @param  array<string, mixed>  $draft
     * @return array{title:string, description:string, modules:list<array{title:string, knowledge_components:list<string>, lessons:list<array{title:string, content_type:string, content_body:string}>}>}
     */
    private function normaliseDraft(array $draft): array
    {
        $modules = [];

        foreach ((array) ($draft['modules'] ?? []) as $module) {
            $lessons = [];

            foreach ((array) ($module['lessons'] ?? []) as $lesson) {
                $lessons[] = [
                    'title' => (string) ($lesson['title'] ?? 'Untitled lesson'),
                    'content_type' => ContentType::tryFrom((string) ($lesson['content_type'] ?? 'text')) ?? ContentType::Text,
                    'content_body' => (string) ($lesson['content_body'] ?? ''),
                ];
            }

            if ($lessons === []) {
                continue;
            }

            $modules[] = [
                'title' => (string) ($module['title'] ?? 'Module'),
                'knowledge_components' => array_values(array_filter(array_map(
                    static fn (mixed $component): string => trim((string) $component),
                    (array) ($module['knowledge_components'] ?? []),
                ))),
                'lessons' => $lessons,
            ];
        }

        if ($modules === []) {
            throw new RuntimeException('The AI course draft contained no modules.');
        }

        return [
            'title' => (string) ($draft['title'] ?? 'Untitled course'),
            'description' => (string) ($draft['description'] ?? ''),
            'modules' => $modules,
        ];
    }

    /**
     * @param  array{title:string, description:string, modules:list<array{title:string, knowledge_components:list<string>, lessons:list<array{title:string, content_type:ContentType, content_body:string}>}>}  $draft
     */
    private function persist(array $draft, User $actor): Course
    {
        $course = Course::query()->create([
            'title' => Str::limit($draft['title'], 240, ''),
            'description' => $draft['description'] !== '' ? $draft['description'] : 'AI-generated course.',
            'instructor_id' => $actor->isInstructor() ? $actor->getKey() : null,
            'created_by' => $actor->getKey(),
            'is_ai_generated' => true,
            'status' => CourseStatus::Published,
        ]);

        $moduleOrder = 1;

        foreach ($draft['modules'] as $moduleDraft) {
            /** @var Module $module */
            $module = $course->modules()->create([
                'title' => Str::limit($moduleDraft['title'], 240, ''),
                'sequence_order' => $moduleOrder++,
            ]);

            $components = [];

            foreach ($moduleDraft['knowledge_components'] as $index => $name) {
                $components[] = KnowledgeComponent::query()->firstOrCreate(
                    [
                        'course_id' => $course->getKey(),
                        'slug' => Str::slug($name.'-'.$index) ?: 'kc-'.$index,
                    ],
                    [
                        'name' => Str::limit($name, 240, ''),
                        'description' => null,
                    ],
                );
            }

            $lessonOrder = 1;

            foreach ($moduleDraft['lessons'] as $lessonDraft) {
                /** @var Lesson $lesson */
                $lesson = $module->lessons()->create([
                    'title' => Str::limit($lessonDraft['title'], 240, ''),
                    'content_type' => $lessonDraft['content_type'],
                    'content_body' => $lessonDraft['content_body'],
                    'sequence_order' => $lessonOrder++,
                ]);

                if ($components !== []) {
                    // Round-robin map every lesson to the module's knowledge
                    // components so every KC is reachable from a lesson.
                    $linked = $components[($lessonOrder - 2) % count($components)];
                    $lesson->knowledgeComponents()->syncWithoutDetaching([$linked->getKey()]);
                }
            }
        }

        return $course;
    }
}
