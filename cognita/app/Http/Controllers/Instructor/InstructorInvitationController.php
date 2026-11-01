<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Instructor\StoreInvitationRequest;
use App\Http\Resources\Instructor\InvitationResource;
use App\Models\ClassInvitation;
use App\Models\PrivateClass;
use App\Models\User;
use App\Services\ClassAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Invite a student to a private class by e-mail.
 *
 * The invitation token is generated here (single use, 14-day expiry) and the
 * class capacity is checked before the row is written so an invite can never
 * overfill a class.
 */
class InstructorInvitationController extends Controller
{
    /** Days an invitation stays valid. */
    private const INVITATION_TTL_DAYS = 14;

    public function __construct(private readonly ClassAccessService $access) {}

    public function store(StoreInvitationRequest $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $model = $this->access->assertInstructorOwnsClass($instructor, $class);

        $this->guardCapacity($model);

        /** @var string $email */
        $email = $request->validated('email');

        $invitation = ClassInvitation::query()->create([
            'class_id' => $model->getKey(),
            'email' => $email,
            'token' => $this->generateToken(),
            'expires_at' => now()->addDays(self::INVITATION_TTL_DAYS),
        ]);

        return (new InvitationResource($invitation))
            ->response()
            ->setStatusCode(201);
    }

    private function guardCapacity(PrivateClass $class): void
    {
        $configuredCap = (int) config('features.max_class_size');
        $classCap = (int) $class->max_students;

        $effectiveCap = $configuredCap > 0
            ? ($classCap > 0 ? min($configuredCap, $classCap) : $configuredCap)
            : $classCap;

        if ($effectiveCap > 0 && ! $class->hasCapacityFor(1)) {
            throw ValidationException::withMessages([
                'class_id' => 'This class is at capacity and cannot accept new invitations.',
            ]);
        }
    }

    private function generateToken(): string
    {
        do {
            $token = Str::random(64);
        } while (ClassInvitation::query()->where('token', $token)->exists());

        return $token;
    }
}
