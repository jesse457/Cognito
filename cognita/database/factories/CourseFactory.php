<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CourseStatus;
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
            'status' => CourseStatus::Published,
            'is_paid' => false,
            'price_cents' => 0,
            'currency' => 'USD',
            'payment_url' => null,
            'payment_instructions' => null,
        ];
    }

    /** A course whose live rooms require a confirmed payment. */
    public function paid(int $priceCents = 4900): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_paid' => true,
            'price_cents' => $priceCents,
            'payment_instructions' => 'Pay by bank transfer and send the reference to your instructor.',
        ]);
    }
}
