<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Session authentication for all three roles. Self sign-up always creates a
 * student; instructors are promoted by an administrator.
 */
class AuthController extends Controller
{
    public function showLogin(): Response
    {
        return Inertia::render('Auth/SignIn');
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        /** @var array{email: string, password: string} $credentials */
        $credentials = $request->validated();

        $email = mb_strtolower($credentials['email']);
        $throttleKey = $email.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Too many sign-in attempts. Try again in a minute.',
            ]);
        }

        $remember = $request->boolean('remember');

        if (! Auth::attempt(['email' => $email, 'password' => $credentials['password']], $remember)) {
            RateLimiter::hit($throttleKey, 60);

            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    public function showRegister(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function register(RegisterRequest $request): RedirectResponse
    {
        /** @var array{name: string, email: string, password: string} $data */
        $data = $request->validated();

        $user = User::query()->create([
            'name' => trim($data['name']),
            'email' => mb_strtolower($data['email']),
            'password' => $data['password'],
            'role' => UserRole::Student,
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('welcome');
    }
}
