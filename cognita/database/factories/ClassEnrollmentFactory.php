<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EnrollmentStatus;
use App\Models\ClassEnrollment;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Unique(class_id, student_id): each factory instance takes a brand-new student.
 *
 * @extends Factory<ClassEnrollment>
 */
class ClassEnrollmentFactory extends Factory
{
    /** @var class-string<ClassEnrollment> */
    protected $model = ClassEnrollment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'class_id' => PrivateClass::factory(),
            'student_id' => User::factory()->student(),
            'status' => EnrollmentStatus::Active,
            'enrolled_at' => now(),
        ];
    }

    public function forClass(?PrivateClass $class = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'class_id' => $class?->getKey() ?? PrivateClass::factory(),
        ]);
    }

    public function forStudent(?User $student = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'student_id' => $student?->getKey() ?? User::factory()->student(),
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => EnrollmentStatus::Active,
        ]);
    }

    public function removed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => EnrollmentStatus::Removed,
        ]);
    }
}
