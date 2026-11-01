<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    /** @var class-string<Course> */
    protected $model = Course::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'instructor_id' => User::factory()->instructor(),
            'title' => $this->faker->catchPhrase(),
            'description' => $this->faker->sentence(12),
        ];
    }
}
