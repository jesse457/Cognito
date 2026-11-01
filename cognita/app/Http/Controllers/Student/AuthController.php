<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Student\LoginRequest;
use App\Http\Requests\Student\RegisterRequest;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Self-registration always creates a `student`. The role is never taken
     * from request input.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        if (! $this->registrationOpen()) {
            abort(403, 'Registration is currently closed.');
        }

        $user = User::query()->create([
            'name' => $request->string('name')->toString(),
            'display_name' => $request->input('display_name'),
            'email' => $request->string('email')->lower()->toString(),
            'password' => $request->string('password')->toString(),
            'role' => UserRole::Student,
            'status' => UserStatus::Active,
        ]);

        $token = $user->createToken('cognita-api')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $this->userPayload($user),
                'token' => $token,
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email')->lower()->toString())->first();

        if ($user === null || ! Hash::check($request->string('password')->toString(), $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        if ($user->isBanned()) {
            abort(403, 'This account has been banned.');
        }

        $user->forceFill(['last_seen_at' => now()])->save();

        $token = $user->createToken('cognita-api')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $this->userPayload($user),
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['data' => ['message' => 'Logged out.']]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $this->userPayload($user)]);
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->getKey(),
            'name' => $user->name,
            'display_name' => $user->display_name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_rank' => $user->role->rank(),
            'status' => $user->status->value,
            'suspended_until' => $user->suspended_until?->toIso8601String(),
            'avatar_url' => $user->avatar_url,
        ];
    }

    /**
     * Registration is controlled by the owner-managed system setting, defaulting
     * to open when the row has not been seeded yet.
     */
    private function registrationOpen(): bool
    {
        $setting = SystemSetting::query()->where('key', 'registration_open')->first();

        if ($setting === null) {
            return true;
        }

        $value = $setting->value;

        return is_array($value) ? (bool) ($value['value'] ?? true) : (bool) $value;
    }
}
