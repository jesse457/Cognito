<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ContentType;
use App\Enums\CourseStatus;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\KnowledgeComponent;
use App\Models\Lesson;
use App\Models\LessonKcMap;
use App\Models\Module;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * The one deterministic AI-generated catalogue course, with modules, lessons,
 * knowledge components and the lesson <-> KC map.
 *
 * Everything is looked up by a stable title/slug (never by row count), so a
 * second run updates in place rather than duplicating the tree.
 */
class CourseSeeder extends Seeder
{
    public const COURSE_TITLE = 'Physics Foundations with AI';

    public const COURSE_DESCRIPTION = 'An AI-generated introduction to classical mechanics, '
        .'built from retrieval-augmented material and knowledge-traced practice.';

    /** @var list<array{title: string, sequence_order: int, lessons: list<array{title: string, content_type: ContentType, body: string}>}> */
    private const MODULE_BLUEPRINT = [
        [
            'title' => 'Kinematics: Describing Motion',
            'sequence_order' => 1,
            'lessons' => [
                [
                    'title' => 'Position, Displacement and Velocity',
                    'content_type' => ContentType::Text,
                    'body' => 'Displacement is the change in position: Δx = x_final − x_initial. '
                        .'Velocity is the rate of change of displacement, v = Δx / Δt.',
                ],
                [
                    'title' => 'Acceleration and Free Fall',
                    'content_type' => ContentType::Video,
                    'body' => 'Acceleration is the rate of change of velocity. Near the Earth\'s surface, '
                        .'gravity produces a constant downward acceleration of about 9.81 m/s².',
                ],
            ],
        ],
        [
            'title' => 'Newtonian Dynamics',
            'sequence_order' => 2,
            'lessons' => [
                [
                    'title' => 'Newton\'s Three Laws of Motion',
                    'content_type' => ContentType::Text,
                    'body' => 'First law: a body keeps its state of motion unless a net external force acts. '
                        .'Second law: F_net = m · a. Third law: every action has an equal and opposite reaction.',
                ],
                [
                    'title' => 'Forces, Friction and Free-Body Diagrams',
                    'content_type' => ContentType::Quiz,
                    'body' => 'Practice identifying the forces acting on a body: weight, normal force, '
                        .'tension, and kinetic or static friction.',
                ],
            ],
        ],
    ];

    /** @var array<string, array{name: string, slug: string, description: string}> */
    private const KC_BLUEPRINT = [
        'displacement' => [
            'name' => 'Displacement and Velocity',
            'slug' => 'displacement-and-velocity',
            'description' => 'Distinguish distance from displacement and compute average velocity.',
        ],
        'acceleration' => [
            'name' => 'Acceleration and Free Fall',
            'slug' => 'acceleration-and-free-fall',
            'description' => 'Apply constant-acceleration kinematics to falling bodies.',
        ],
        'newtons-laws' => [
            'name' => "Newton's Laws",
            'slug' => 'newtons-laws',
            'description' => 'State and apply the three laws of motion to simple systems.',
        ],
        'friction' => [
            'name' => 'Forces and Friction',
            'slug' => 'forces-and-friction',
            'description' => 'Draw free-body diagrams and resolve forces including friction.',
        ],
    ];

    /** @var array<string, list<string>> lesson title => KC slugs */
    private const LESSON_KC_MAP = [
        'Position, Displacement and Velocity' => ['displacement-and-velocity'],
        'Acceleration and Free Fall' => ['acceleration-and-free-fall', 'displacement-and-velocity'],
        "Newton's Three Laws of Motion" => ['newtons-laws'],
        'Forces, Friction and Free-Body Diagrams' => ['forces-and-friction', 'newtons-laws'],
    ];

    public function run(): void
    {
        $instructor = User::query()->where('role', UserRole::Instructor->value)->orderBy('id')->first();
        $admin = User::query()->where('role', UserRole::Admin->value)->orderBy('id')->first();

        /** @var Course $course */
        $course = Course::query()->updateOrCreate(
            ['title' => self::COURSE_TITLE],
            [
                'description' => self::COURSE_DESCRIPTION,
                'instructor_id' => $instructor?->getKey(),
                'created_by' => $admin?->getKey(),
                'is_ai_generated' => true,
                'status' => CourseStatus::Published,
                'removed_by' => null,
                'removal_reason' => null,
            ],
        );

        foreach (self::MODULE_BLUEPRINT as $moduleDefinition) {
            /** @var Module $module */
            $module = Module::query()->updateOrCreate(
                [
                    'course_id' => $course->getKey(),
                    'title' => $moduleDefinition['title'],
                ],
                ['sequence_order' => $moduleDefinition['sequence_order']],
            );

            foreach ($moduleDefinition['lessons'] as $index => $lessonDefinition) {
                $this->upsertLesson($module, $lessonDefinition, $index + 1);
            }
        }

        $components = $this->upsertKnowledgeComponents($course);
        $this->syncLessonKcMap($course, $components);
    }

    /**
     * @param  array{title: string, content_type: ContentType, body: string}  $definition
     */
    private function upsertLesson(Module $module, array $definition, int $sequenceOrder): Lesson
    {
        /** @var Lesson $lesson */
        $lesson = Lesson::query()->updateOrCreate(
            [
                'module_id' => $module->getKey(),
                'title' => $definition['title'],
            ],
            [
                'content_type' => $definition['content_type'],
                'content_url' => $definition['content_type'] === ContentType::Video
                    ? 'https://videos.cognita.test/physics/'.$module->sequence_order.'-'.$sequenceOrder.'.mp4'
                    : null,
                'content_body' => $definition['content_type'] === ContentType::Video ? null : $definition['body'],
                'sequence_order' => $sequenceOrder,
            ],
        );

        return $lesson;
    }

    /**
     * @return array<string, KnowledgeComponent> slug => component
     */
    private function upsertKnowledgeComponents(Course $course): array
    {
        $components = [];

        foreach (self::KC_BLUEPRINT as $definition) {
            /** @var KnowledgeComponent $component */
            $component = KnowledgeComponent::query()->updateOrCreate(
                [
                    'course_id' => $course->getKey(),
                    'slug' => $definition['slug'],
                ],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                ],
            );

            $components[$definition['slug']] = $component;
        }

        return $components;
    }

    /**
     * Attach each lesson to 1–2 knowledge components, idempotently.
     *
     * The pivot is synced to exactly the blueprint set, so re-runs neither
     * duplicate rows nor drift if the blueprint changes. The pivot keeps its
     * unique(lesson_id, knowledge_component_id) guarantee.
     *
     * @param  array<string, KnowledgeComponent>  $components
     */
    private function syncLessonKcMap(Course $course, array $components): void
    {
        $lessons = Lesson::query()
            ->whereIn('module_id', Module::query()->where('course_id', $course->getKey())->pluck('id'))
            ->get();

        foreach ($lessons as $lesson) {
            $slugs = self::LESSON_KC_MAP[$lesson->title] ?? [];

            $ids = [];

            foreach ($slugs as $slug) {
                if (isset($components[$slug])) {
                    $ids[] = $components[$slug]->getKey();
                }
            }

            if ($ids === []) {
                // Fall back to the first KC so every lesson is traceable.
                $ids[] = reset($components)->getKey();
            }

            // Keep the pivot exactly in sync with the blueprint on every run;
            // sync() is a no-op when the rows already exist.
            $lesson->knowledgeComponents()->sync($ids);

            foreach ($ids as $componentId) {
                LessonKcMap::query()->firstOrCreate([
                    'lesson_id' => $lesson->getKey(),
                    'knowledge_component_id' => $componentId,
                ]);
            }
        }
    }
}
