<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSystemSettingsRequest;
use App\Models\User;
use App\Services\AdminScopeService;
use App\Services\SystemSettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Owner-only system settings. Reads are cached for 60s by the service; the
 * write path returns the full refreshed map so the panel can render it directly.
 */
final class SystemSettingController extends Controller
{
    public function __construct(
        private readonly SystemSettingService $settings,
        private readonly AdminScopeService $scope,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $this->actor($request);

        $this->scope->assertCanAccessSettings($actor);

        return response()->json([
            'data' => $this->settings->all(),
            'meta' => [
                'cache_key' => SystemSettingService::CACHE_KEY,
                'cache_ttl' => SystemSettingService::CACHE_TTL,
            ],
        ]);
    }

    public function update(UpdateSystemSettingsRequest $request): JsonResponse
    {
        $actor = $this->actor($request);

        $description = $request->description();

        foreach ($request->settings() as $key => $value) {
            $this->settings->set($actor, (string) $key, $value, $description);
        }

        return response()->json([
            'data' => $this->settings->all(),
        ]);
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401, 'Unauthenticated.');

        return $user;
    }
}
