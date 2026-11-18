<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserRoleRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Account administration. The only write powers are "change role" and "delete
 * account": an admin never edits someone else's classes or courses.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $search = trim((string) $request->query('search', ''));
        $role = (string) $request->query('role', '');

        $users = User::query()
            ->when($search !== '', function ($query) use ($search): void {
                $like = '%'.mb_strtolower($search).'%';

                $query->where(function ($inner) use ($like): void {
                    $inner->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                });
            })
            ->when(in_array($role, UserRole::assignable(), true), fn ($query) => $query->where('role', $role))
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => (int) $user->getKey(),
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'created_at' => $user->created_at?->toDateString(),
            ]);

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => ['search' => $search, 'role' => $role],
        ]);
    }

    public function updateRole(UpdateUserRoleRequest $request, User $user): RedirectResponse
    {
        $this->authorize('updateRole', $user);

        /** @var array{role: string} $data */
        $data = $request->validated();

        $user->update(['role' => UserRole::from($data['role'])]);

        return back()->with('success', $user->name.' is now '.UserRole::from($data['role'])->label().'.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        $user->delete();

        return back()->with('success', 'Account deleted.');
    }
}
