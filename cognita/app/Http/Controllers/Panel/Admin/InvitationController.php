<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Services\StaffInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff invitations. Owners may invite admins or moderators; admins may invite
 * moderators only. The invitee sets their own password through the emailed link.
 */
class InvitationController extends Controller
{
    public function __construct(private readonly StaffInvitationService $invitations) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', StaffInvitation::class);

        /** @var User $actor */
        $actor = $request->user();

        $invitations = StaffInvitation::query()
            ->with('inviter:id,name,display_name')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (StaffInvitation $invitation): array => [
                'id' => $invitation->getKey(),
                'email' => $invitation->email,
                'role' => $invitation->role->value,
                'role_label' => $invitation->role->label(),
                'inviter' => $invitation->inviter?->displayLabel(),
                'expires_at' => $invitation->expires_at?->toIso8601String(),
                'accepted_at' => $invitation->accepted_at?->toIso8601String(),
                'is_expired' => $invitation->isExpired(),
                'is_accepted' => $invitation->isAccepted(),
                'created_at' => $invitation->created_at?->toIso8601String(),
            ]);

        $invitable = app(\App\Policies\StaffInvitationPolicy::class)->invitableRolesFor($actor);

        return Inertia::render('Admin/Invitations/Index', [
            'invitations' => $invitations,
            'roles' => array_values(array_map(
                static fn (string $role): array => [
                    'value' => $role,
                    'label' => UserRole::from($role)->label(),
                ],
                $invitable,
            )),
            'capabilities' => [
                'can_invite' => $invitable !== [],
                'can_revoke' => Gate::forUser($actor)->allows('revoke', StaffInvitation::class),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', 'string', 'in:'.implode(',', UserRole::invitableValues())],
        ]);

        $role = UserRole::from($validated['role']);

        Gate::forUser($actor)->authorize('create', [StaffInvitation::class, $role]);

        $invitation = $this->invitations->invite($actor, $validated['email'], $role);

        return back()->with('success', "Invitation sent to {$invitation->email} for the {$role->label()} role.");
    }

    public function destroy(Request $request, int $invitation): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();

        Gate::forUser($actor)->authorize('revoke', StaffInvitation::class);

        $model = StaffInvitation::query()->findOrFail($invitation);

        $this->invitations->revoke($actor, $model);

        return back()->with('success', "Invitation for {$model->email} was revoked.");
    }
}
