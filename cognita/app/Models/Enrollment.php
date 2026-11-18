<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PaymentStatus;
use Database\Factories\EnrollmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A student's membership of one class. Created when the class key is accepted.
 *
 * When the class belongs to a paid course the membership also carries the
 * payment state: the key gets a student into the class, and a confirmed payment
 * gets them into its live room.
 */
class Enrollment extends Model
{
    /** @use HasFactory<EnrollmentFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'student_id',
        'joined_at',
        'payment_status',
        'amount_paid_cents',
        'paid_at',
        'payment_reference',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'payment_status' => PaymentStatus::class,
            'amount_paid_cents' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /** @return BelongsTo<User, $this> */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function isPaid(): bool
    {
        return $this->payment_status === PaymentStatus::Paid;
    }

    public function isPending(): bool
    {
        return $this->payment_status === PaymentStatus::Pending;
    }

    /**
     * Whether this membership opens the live room of its class.
     *
     * A free course never asks for money; a paid course only accepts a
     * membership the instructor has confirmed as paid.
     */
    public function grantsLiveAccess(?Course $course): bool
    {
        return $course === null || ! $course->requiresPayment() || $this->isPaid();
    }
}
