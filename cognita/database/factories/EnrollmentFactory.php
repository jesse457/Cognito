<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Enrollment>
 */
class EnrollmentFactory extends Factory
{
    /** @var class-string<Enrollment> */
    protected $model = Enrollment::class;

    /**
     * `enrollments` has a unique(user_id, course_id) constraint, so the two FKs
     * are independent students/courses by default. Pass `->for($user)` or
     * `->for($course)` (or both) to pin them.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->student(),
            'course_id' => Course::factory(),
            'enrolled_at' => now(),
        ];
    }

    public function forStudent(?User $student = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'user_id' => $student?->getKey() ?? User::factory()->student(),
        ]);
    }

    public function forCourse(?Course $course = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'course_id' => $course?->getKey() ?? Course::factory(),
        ]);
    }

    /**
     * Enrolled a while ago rather than right now.
     */
    public function longStanding(int $days = 30): static
    {
        return $this->state(fn (array $attributes): array => [
            'enrolled_at' => now()->subDays($days),
        ]);
    }
}
