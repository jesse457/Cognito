<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\LiveCallService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Browser entry point for a class group voice call.
 *
 * The page renders for the class instructor and active class members only.
 * The token endpoint mints a short-lived, voice-only LiveKit grant for the
 * same caller. The page requests the token after the Join button is pressed,
 * so the microphone prompt stays tied to a user gesture.
 */
class LiveCallController extends Controller
{
    public function __construct(private readonly LiveCallService $liveCalls) {}

    public function show(Request $request, int $class): Response
    {
        /** @var User $user */
        $user = $request->user();

        ['class' => $model, 'role' => $role] = $this->liveCalls->authorize($user, $class);

        return Inertia::render('LiveCall/Room', [
            'class' => [
                'id' => (int) $model->getKey(),
                'name' => $model->name,
                'description' => $model->description,
                'instructor' => $model->instructor?->displayLabel(),
                'status' => $model->status->value,
            ],
            'role' => $role,
            'room' => $this->liveCalls->roomFor($model),
            'configured' => $this->liveCalls->configured(),
            'tokenUrl' => route('live-calls.token', ['class' => $model->getKey()]),
            'backUrl' => $this->backUrl($role, (int) $model->getKey()),
        ]);
    }

    public function token(Request $request, int $class): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        ['class' => $model, 'role' => $role] = $this->liveCalls->authorize($user, $class);

        return response()->json([
            'data' => $this->liveCalls->token($user, $model, $role),
        ]);
    }

    private function backUrl(string $role, int $classId): string
    {
        if ($role === LiveCallService::ROLE_HOST && Route::has('panel.instructor.classes.show')) {
            return route('panel.instructor.classes.show', ['class' => $classId]);
        }

        return route('home');
    }
}
