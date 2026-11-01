<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CourseStatus;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

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
        $title = Str::title($this->faker->unique()->words(3, true));

        return [
            'title' => $title,
            'description' => $this->faker->paragraph(),
            // Courses may be orphaned in production (nullOnDelete), so the FKs
            // are optional here; pass an instructor/creator explicitly when the
            // relation matters.
            'instructor_id' => null,
            'created_by' => null,
            'is_ai_generated' => true,
            'status' => CourseStatus::Published,
            'removed_by' => null,
            'removal_reason' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => CourseStatus::Published,
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => CourseStatus::Draft,
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => CourseStatus::Archived,
        ]);
    }

    /**
     * Staff-removed course; needs the removing staff member (`$removedBy`).
     */
    public function removed(?User $removedBy = null, ?string $reason = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => CourseStatus::Removed,
            'removed_by' => $removedBy?->getKey(),
            'removal_reason' => $reason ?? 'Removed by staff.',
        ]);
    }

    public function aiGenerated(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_ai_generated' => true,
        ]);
    }

    public function humanAuthored(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_ai_generated' => false,
        ]);
    }

    /**
     * Attach an instructor, and default the creator to that instructor.
     */
    public function forInstructor(?User $instructor = null): static
    {
        return $this->state(function (array $attributes) use ($instructor): array {
            $instructorId = $instructor?->getKey() ?? User::factory()->instructor();

            return [
                'instructor_id' => $instructorId,
                'created_by' => $attributes['created_by'] ?? $instructorId,
            ];
        });
    }

    public function createdBy(?User $user = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'created_by' => $user?->getKey() ?? User::factory()->admin(),
        ]);
    }
}
