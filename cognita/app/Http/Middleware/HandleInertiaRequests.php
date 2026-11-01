<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

/**
 * Shares the small, stable slice of server state every panel page needs:
 * the authenticated actor, one-shot flashes, which surface is mounted, and the
 * feature flags that change the navigation.
 */
class HandleInertiaRequests extends Middleware
{
    /** @var string */
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        return [
            ...parent::share($request),
            'appName' => config('app.name'),
            'panel' => $this->panelFor($request),
            'auth' => [
                'user' => $user === null ? null : [
                    'id' => $user->getKey(),
                    'name' => $user->name,
                    'display_name' => $user->display_name,
                    'display_label' => $user->displayLabel(),
                    'initials' => $user->initials(),
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'role_label' => $user->role->label(),
                    'role_rank' => $user->role->rank(),
                    'is_staff' => $user->isStaff(),
                    'is_instructor' => $user->isInstructor(),
                    'status' => $user->status->value,
                ],
            ],
            'features' => [
                'instructorPath' => (bool) config('features.instructor_path'),
                'social' => (bool) config('features.social'),
                'liveCalls' => (bool) config('features.live_calls'),
                'ktEngine' => strtoupper((string) config('features.kt_engine')),
            ],
            'flash' => [
                'success' => fn (): ?string => $request->session()->get('success'),
                'error' => fn (): ?string => $request->session()->get('error'),
            ],
        ];
    }

    /** Which console surface the current route belongs to. */
    private function panelFor(Request $request): ?string
    {
        $name = $request->route()?->getName() ?? '';

        return match (true) {
            str_starts_with($name, 'panel.admin.') => 'admin',
            str_starts_with($name, 'panel.instructor.') => 'instructor',
            default => null,
        };
    }
}
