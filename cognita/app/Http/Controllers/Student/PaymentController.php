<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * A student's "I have paid" notice.
 *
 * The student cannot confirm their own payment; the notice only moves the
 * membership to `pending`. The instructor confirms it from the class roster,
 * and only that confirmation unlocks the live room.
 */
class PaymentController extends Controller
{
    public function store(Request $request, Classroom $classroom): RedirectResponse
    {
        /** @var User $student */
        $student = $request->user();

        $this->authorize('reportPayment', $classroom);

        abort_unless($classroom->requiresPayment(), 422, 'This class belongs to a free course.');

        $enrollment = $classroom->enrollmentFor($student);

        abort_if($enrollment === null, 403, 'Join this class with its key first.');

        if ($enrollment->isPaid()) {
            return back()->with('success', 'Your payment is already confirmed.');
        }

        /** @var array{payment_reference?: string|null} $data */
        $data = $request->validate([
            'payment_reference' => ['nullable', 'string', 'max:190'],
        ]);

        $enrollment->forceFill([
            'payment_status' => PaymentStatus::Pending,
            'payment_reference' => $data['payment_reference'] ?? $enrollment->payment_reference,
        ])->save();

        return back()->with('success', 'Thanks. Your instructor will confirm the payment and unlock the live room.');
    }
}
