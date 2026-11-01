<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\ClassroomAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Every signed-in user lands here; the role decides which surface opens.
 *
 * If the visitor typed a class key before signing in, that key is applied now
 * and the student goes straight into the class call.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request, ClassroomAccess $access): RedirectResponse
    {
        $user = $request->user();

        if ($user === null) {
            return redirect()->route('login');
        }

        $pendingKey = $request->session()->pull('pending_join_key');

        if ($user->isStudent() && is_string($pendingKey) && $pendingKey !== '') {
            try {
                $classroom = $access->join($user, $pendingKey);

                return redirect()
                    ->route('call.show', ['classroom' => $classroom->getKey()])
                    ->with('success', 'You joined '.$classroom->name.'.');
            } catch (ValidationException) {
                return redirect($access->dashboardFor($user))
                    ->with('error', 'That class key is no longer valid. Ask your instructor for a new one.');
            }
        }

        return redirect($access->dashboardFor($user));
    }
}
