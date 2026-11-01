<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Instructor;

use App\Http\Controllers\Controller;
use App\Models\ClassInvitation;
use App\Models\User;
use App\Services\ClassAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Invite a student to a private class from the console.
 *
 * There is no dedicated service for this path: the console writes the same
 * `class_invitations` row the API produces, but it deliberately stops at the
 * row. E-mail delivery is out of scope for the console and stays owned by the
 * API flow, so nothing is sent from here.
 */
class InvitationController extends Controller
{
    /** Days an invitation stays valid. */
    private const INVITATION_TTL_DAYS = 7;

    public function __construct(private readonly ClassAccessService $access) {}

    public function store(Request $request, int $class): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $model = $this->access->assertInstructorOwnsClass($instructor, $class);

        /** @var array{email:string} $data */
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        ClassInvitation::query()->create([
            'class_id' => $model->getKey(),
            'email' => $data['email'],
            'token' => Str::random(64),
            'expires_at' => now()->addDays(self::INVITATION_TTL_DAYS),
        ]);

        return back()->with(
            'success',
            sprintf('Invitation recorded for %s. It expires in %d days.', $data['email'], self::INVITATION_TTL_DAYS),
        );
    }
}
