<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Module>
 */
class ModuleFactory extends Factory
{
    /** @var class-string<Module> */
    protected $model = Module::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'title' => Str::title($this->faker->unique()->words(3, true)),
            'sequence_order' => $this->faker->numberBetween(1, 10),
        ];
    }

    /**
     * Append the module after every existing module of its course.
     *
     * Resolved lazily from the eventual `course_id` state value, so it works
     * with both `make()` and `create()`.
     */
    public function nextInCourse(): static
    {
        return $this->state(function (array $attributes): array {
            $courseId = $attributes['course_id'] ?? null;

            if (! is_int($courseId) && ! is_string($courseId)) {
                return [];
            }

            return [
                'sequence_order' => ((int) Module::query()->where('course_id', $courseId)->max('sequence_order')) + 1,
            ];
        });
    }
}
