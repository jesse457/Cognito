<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\JoinClassroomRequest;
use App\Models\User;
use App\Services\ClassroomAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * The class-key door.
 *
 * A guest who types a valid key is sent to sign-in with the key remembered, so
 * the key is not lost on the way to an account. A signed-in student joins
 * immediately and lands in the class call.
 */
class JoinController extends Controller
{
    public function __construct(private readonly ClassroomAccess $access) {}

    public function store(JoinClassroomRequest $request): RedirectResponse
    {
        /** @var array{key: string} $data */
        $data = $request->validated();

        /** @var User|null $user */
        $user = $request->user();

        if ($user === null) {
            $classroom = $this->access->lookupByJoinCode($data['key']);

            if ($classroom === null) {
                throw ValidationException::withMessages([
                    'key' => 'That class key does not match any class. Check it with your instructor.',
                ]);
            }

            $request->session()->put('pending_join_key', $classroom->join_code);

            return redirect()
                ->route('login')
                ->with('success', 'Sign in and we will take you into '.$classroom->name.'.');
        }

        if (! $user->isStudent()) {
            return redirect($this->access->dashboardFor($user))
                ->with('error', 'Classes are joined with a key from a student account.');
        }

        $classroom = $this->access->join($user, $data['key']);

        return redirect()
            ->route('call.show', ['classroom' => $classroom->getKey()])
            ->with('success', 'You joined '.$classroom->name.'.');
    }
}
