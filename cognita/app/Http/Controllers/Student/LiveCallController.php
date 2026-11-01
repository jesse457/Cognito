<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LiveCallService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * JSON counterpart of the browser call page, for the API-first student client.
 */
class LiveCallController extends Controller
{
    public function __construct(private readonly LiveCallService $liveCalls) {}

    public function token(Request $request, int $class): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        ['class' => $model, 'role' => $role] = $this->liveCalls->authorize($user, $class);

        return response()->json([
            'data' => $this->liveCalls->token($user, $model, $role),
        ]);
    }
}
