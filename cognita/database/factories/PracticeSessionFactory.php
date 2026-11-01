<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\PracticeSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PracticeSession>
 */
class PracticeSessionFactory extends Factory
{
    /** @var class-string<PracticeSession> */
    protected $model = PracticeSession::class;

    /**
     * No unique constraints: several sessions per user/course/lesson are valid.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->student(),
            'course_id' => Course::factory(),
            'lesson_id' => null,
            'started_at' => now()->subMinutes($this->faker->numberBetween(5, 600)),
            'completed_at' => null,
        ];
    }

    public function forUser(?User $user = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'user_id' => $user?->getKey() ?? User::factory()->student(),
        ]);
    }

    /**
     * Pin the lesson and adopt its course, so session.course_id always matches
     * the lesson's module's course.
     */
    public function forLesson(?Lesson $lesson = null): static
    {
        return $this->state(function (array $attributes) use ($lesson): array {
            $lesson ??= Lesson::factory()->create();

            return [
                'lesson_id' => $lesson->getKey(),
                'course_id' => $lesson->module?->course_id ?? $attributes['course_id'] ?? Course::factory(),
            ];
        });
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'started_at' => now()->subHour(),
            'completed_at' => now()->subMinutes(30),
        ]);
    }
}
