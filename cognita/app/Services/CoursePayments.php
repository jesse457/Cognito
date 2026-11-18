<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Currency;
use App\Enums\PaymentStatus;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;

/**
 * The payment side of a class, in the shape the browser needs.
 *
 * The class key gets a student into the class. This service answers the second
 * question: does the live room open for them, what does the course cost, and
 * what should the page show them while it is still locked?
 */
class CoursePayments
{
    /**
     * @return array{
     *     required: bool,
     *     can_access: bool,
     *     status: string,
     *     status_label: string,
     *     price_cents: int,
     *     currency: string,
     *     price_label: string|null,
     *     payment_url: string|null,
     *     payment_instructions: string|null,
     *     reference: string|null,
     *     paid_at: string|null,
     *     submit_url: string|null
     * }
     */
    public function stateFor(Classroom $classroom, ?User $student): array
    {
        $course = $classroom->course;
        $enrollment = $student === null ? null : $classroom->enrollmentFor($student);
        $required = $course?->requiresPayment() ?? false;
        $status = $this->status($required, $enrollment);

        return [
            'required' => $required,
            'can_access' => ! $required || $enrollment?->isPaid() === true,
            'status' => $status->value,
            'status_label' => $status->label(),
            'price_cents' => (int) ($course?->price_cents ?? 0),
            'currency' => ($course?->currency ?? Currency::USD)->value,
            'price_label' => $required ? $course?->priceLabel() : null,
            'payment_url' => $required ? $course?->payment_url : null,
            'payment_instructions' => $required ? $course?->payment_instructions : null,
            'reference' => $enrollment?->payment_reference,
            'paid_at' => $enrollment?->paid_at?->toIso8601String(),
            'submit_url' => $required && $student !== null && ! $status->isPaid()
                ? route('student.payment.store', ['classroom' => $classroom->getKey()])
                : null,
        ];
    }

    /** The payment state of the caller's membership, or the guest's view. */
    public function status(bool $required, ?Enrollment $enrollment): PaymentStatus
    {
        if (! $required) {
            return PaymentStatus::Free;
        }

        if ($enrollment === null || $enrollment->payment_status === PaymentStatus::Free) {
            return PaymentStatus::Unpaid;
        }

        return $enrollment->payment_status;
    }
}
