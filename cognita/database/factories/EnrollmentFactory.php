<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Classroom;
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
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'classroom_id' => Classroom::factory(),
            'student_id' => User::factory()->student(),
            'joined_at' => now(),
        ];
    }
}
