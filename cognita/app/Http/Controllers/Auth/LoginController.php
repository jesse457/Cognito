<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff console sign-in. Session based (the JSON API keeps using Sanctum).
 */
class LoginController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/SignIn');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        /** @var User|null $user */
        $user = User::query()->where('email', mb_strtolower($credentials['email']))->first();

        if ($user !== null && $user->isBanned()) {
            throw ValidationException::withMessages([
                'email' => 'This account has been banned.',
            ]);
        }

        if (! Auth::attempt(
            ['email' => mb_strtolower($credentials['email']), 'password' => $credentials['password']],
            $request->boolean('remember'),
        )) {
            RateLimiter::hit($this->throttleKey($request));

            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        RateLimiter::clear($this->throttleKey($request));
        $request->session()->regenerate();

        $user = $request->user();
        $user?->forceFill(['last_seen_at' => now()])->save();

        return redirect()->intended(self::homeFor($user));
    }

    /** Where an authenticated actor lands by role. */
    public static function homeFor(?User $user): string
    {
        if ($user === null) {
            return route('login');
        }

        if ($user->isStaff()) {
            return route('panel.admin.dashboard');
        }

        if ($user->isInstructor() && config('features.instructor_path')) {
            return route('panel.instructor.dashboard');
        }

        return route('home');
    }

    private function throttleKey(Request $request): string
    {
        return mb_strtolower((string) $request->input('email')).'|'.$request->ip();
    }
}
