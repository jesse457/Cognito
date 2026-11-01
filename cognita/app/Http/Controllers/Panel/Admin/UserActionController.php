<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminScopeService;
use App\Services\UserManagementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Moderation mutations for a single account. Every write goes through
 * UserManagementService, which owns the transaction, the audit row and the
 * target notification.
 */
class UserActionController extends Controller
{
    public function __construct(
        private readonly AdminScopeService $scope,
        private readonly UserManagementService $users,
    ) {}

    public function warn(Request $request, int $user): RedirectResponse
    {
        [$actor, $target] = $this->authorizeAction($request, $user, 'warn');

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $this->users->warn($actor, $target, $validated['reason']);

        return back()->with('success', "{$target->displayLabel()} was warned and the action was audited.");
    }

    public function suspend(Request $request, int $user): RedirectResponse
    {
        [$actor, $target] = $this->authorizeAction($request, $user, 'suspend');

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
            'days' => ['required', 'integer', 'min:1', 'max:30'],
        ]);

        $this->users->suspend($actor, $target, $validated['reason'], (int) $validated['days']);

        return back()->with('success', "{$target->displayLabel()} was suspended for {$validated['days']} day(s).");
    }

    public function ban(Request $request, int $user): RedirectResponse
    {
        [$actor, $target] = $this->authorizeAction($request, $user, 'ban');

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $this->users->ban($actor, $target, $validated['reason']);

        return back()->with('success', "{$target->displayLabel()} was banned and the action was audited.");
    }

    public function unban(Request $request, int $user): RedirectResponse
    {
        [$actor, $target] = $this->authorizeAction($request, $user, 'unban');

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'min:3', 'max:2000'],
        ]);

        $this->users->unban($actor, $target, $validated['reason'] ?? 'manual unban');

        return back()->with('success', "{$target->displayLabel()} was reinstated.");
    }

    public function changeRole(Request $request, int $user): RedirectResponse
    {
        [$actor, $target] = $this->authorizeAction($request, $user, 'changeRole');

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:'.implode(',', UserRole::invitableValues()).',instructor,student'],
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $newRole = UserRole::from($validated['role']);

        $this->users->changeRole($actor, $target, $newRole, $validated['reason']);

        return back()->with('success', "{$target->displayLabel()} is now {$newRole->label()}.");
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function authorizeAction(Request $request, int $userId, string $ability): array
    {
        /** @var User $actor */
        $actor = $request->user();
        $target = $this->scope->findUserForAdmin($actor, $userId);

        Gate::forUser($actor)->authorize($ability, $target);

        return [$actor, $target];
    }
}
