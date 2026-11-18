<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PaymentStatus;
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
            'payment_status' => PaymentStatus::Free->value,
            'amount_paid_cents' => 0,
            'paid_at' => null,
            'payment_reference' => null,
        ];
    }

    /** A membership the instructor has confirmed as paid. */
    public function paid(int $amountCents = 4900): static
    {
        return $this->state(fn (array $attributes): array => [
            'payment_status' => PaymentStatus::Paid->value,
            'amount_paid_cents' => $amountCents,
            'paid_at' => now(),
        ]);
    }

    /** A student who says they have paid and is waiting for confirmation. */
    public function pending(): static
    {
        return $this->state(fn (array $attributes): array => [
            'payment_status' => PaymentStatus::Pending->value,
            'paid_at' => null,
        ]);
    }
}
