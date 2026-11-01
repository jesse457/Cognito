<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AnswerHistory;
use App\Models\KnowledgeComponent;
use App\Models\Lesson;
use App\Models\PracticeSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * One multiple-choice answer row for the knowledge-tracing pipeline.
 *
 * The row has three required FKs (`user_id`, `session_id`, `lesson_id`) that
 * must agree with each other, so `create()` reconciles them after the related
 * factories have resolved: the practice session is pinned to the answer's user
 * and to the lesson's course, and the KC is taken from the lesson's mapping.
 *
 * @extends Factory<AnswerHistory>
 */
class AnswerHistoryFactory extends Factory
{
    /** @var class-string<AnswerHistory> */
    protected $model = AnswerHistory::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $isCorrect = $this->faker->boolean(70);

        return [
            'user_id' => User::factory()->student(),
            'session_id' => PracticeSession::factory(),
            'lesson_id' => Lesson::factory(),
            'knowledge_component_id' => null,
            'question_payload' => [
                'prompt' => $this->faker->sentence(6).'?',
                'options' => [
                    ['id' => 'a', 'label' => $this->faker->words(3, true)],
                    ['id' => 'b', 'label' => $this->faker->words(3, true)],
                    ['id' => 'c', 'label' => $this->faker->words(3, true)],
                    ['id' => 'd', 'label' => $this->faker->words(3, true)],
                ],
                'correct_option' => 'a',
                'difficulty' => $this->faker->randomFloat(2, 0.1, 0.9),
            ],
            'user_answer' => ['selected' => $isCorrect ? 'a' : 'd', 'correct' => $isCorrect],
            'is_correct' => $isCorrect,
            'time_taken_ms' => $this->faker->numberBetween(1_500, 90_000),
        ];
    }

    public function correct(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_correct' => true,
            'user_answer' => ['selected' => 'a', 'correct' => true],
        ]);
    }

    public function incorrect(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_correct' => false,
            'user_answer' => ['selected' => 'd', 'correct' => false],
        ]);
    }

    /**
     * Pin the answer to a lesson (its module decides the course).
     */
    public function forLesson(?Lesson $lesson = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'lesson_id' => $lesson?->getKey() ?? Lesson::factory(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create($attributes = [], ?Model $parent = null): AnswerHistory
    {
        $attributes = $this->reconcile($attributes);

        /** @var AnswerHistory $answer */
        $answer = parent::create($attributes, $parent);

        return $answer;
    }

    /**
     * Make the three FKs refer to one coherent user/course/lesson triple.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function reconcile(array $attributes): array
    {
        $session = $this->existingModel(PracticeSession::class, $attributes['session_id'] ?? null);
        $lesson = $this->existingModel(Lesson::class, $attributes['lesson_id'] ?? null);
        $user = $this->existingModel(User::class, $attributes['user_id'] ?? null);

        if ($session instanceof PracticeSession && $lesson instanceof Lesson) {
            $courseId = $lesson->module?->course_id;

            $session->forceFill(array_filter(
                ['user_id' => $user?->getKey(), 'course_id' => $courseId],
                static fn (mixed $value): bool => $value !== null,
            ));
            $session->save();

            $attributes['session_id'] = $session->getKey();
            $attributes['user_id'] = $session->user_id;
            $attributes['lesson_id'] = $lesson->getKey();
        }

        if (($attributes['knowledge_component_id'] ?? null) === null) {
            $lessonId = $attributes['lesson_id'] ?? null;

            if (is_int($lessonId) || is_string($lessonId)) {
                $attributes['knowledge_component_id'] = KnowledgeComponent::query()
                    ->whereHas('lessonKcMaps', fn ($query) => $query->where('lesson_id', (int) $lessonId))
                    ->value('id');
            }
        }

        return $attributes;
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    private function existingModel(string $modelClass, mixed $value): ?Model
    {
        if ($value instanceof $modelClass) {
            return $value;
        }

        if (is_int($value) || is_string($value)) {
            return $modelClass::query()->find($value);
        }

        return null;
    }
}
