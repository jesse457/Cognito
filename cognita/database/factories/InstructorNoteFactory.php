<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\InstructorNote;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Private instructor note about a student — never student-visible.
 *
 * @extends Factory<InstructorNote>
 */
class InstructorNoteFactory extends Factory
{
    /** @var class-string<InstructorNote> */
    protected $model = InstructorNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'class_id' => PrivateClass::factory(),
            'student_id' => User::factory()->student(),
            'instructor_id' => User::factory()->instructor(),
            'note' => $this->faker->paragraphs(1, true),
        ];
    }

    public function forClass(?PrivateClass $class = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'class_id' => $class?->getKey() ?? PrivateClass::factory(),
        ]);
    }

    public function about(?User $student = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'student_id' => $student?->getKey() ?? User::factory()->student(),
        ]);
    }

    public function by(?User $instructor = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'instructor_id' => $instructor?->getKey() ?? User::factory()->instructor(),
        ]);
    }
}
