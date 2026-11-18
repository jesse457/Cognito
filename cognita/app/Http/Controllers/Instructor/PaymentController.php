<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * The instructor's confirmation of a student's payment.
 *
 * Joining a paid course with the class key creates an unpaid membership. This
 * endpoint is the only way an enrolment becomes paid, so the live room always
 * waits for the person who actually received the money.
 */
class PaymentController extends Controller
{
    public function update(Request $request, Classroom $classroom, User $student): RedirectResponse
    {
        $this->authorize('confirmPayments', $classroom);

        abort_unless($classroom->requiresPayment(), 422, 'This class belongs to a free course.');

        $enrollment = $classroom->enrollments()
            ->where('student_id', $student->getKey())
            ->firstOrFail();

        /** @var array{payment_status: string, amount_paid_cents?: int|null, payment_reference?: string|null} $data */
        $data = $request->validate([
            'payment_status' => ['required', 'string', Rule::in(PaymentStatus::assignable())],
            'amount_paid_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'payment_reference' => ['nullable', 'string', 'max:190'],
        ]);

        $status = PaymentStatus::from($data['payment_status']);
        $paid = $status->isPaid();

        $enrollment->forceFill([
            'payment_status' => $status,
            'amount_paid_cents' => $paid
                ? (int) ($data['amount_paid_cents'] ?? $classroom->course?->price_cents ?? 0)
                : 0,
            'paid_at' => $paid ? ($enrollment->paid_at ?? now()) : null,
            'payment_reference' => $data['payment_reference'] ?? $enrollment->payment_reference,
        ])->save();

        $message = match ($status) {
            PaymentStatus::Paid => 'Payment confirmed. '.$student->name.' can enter the live room now.',
            PaymentStatus::Pending => 'Marked as awaiting payment confirmation.',
            PaymentStatus::Unpaid => 'Payment removed. The live room is locked for '.$student->name.'.',
            PaymentStatus::Free => 'Payment cleared.',
        };

        return back()->with('success', $message);
    }
}
