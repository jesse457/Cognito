<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\SystemSettingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Owner-only runtime settings. Values are cached for 60 seconds by the service
 * and the cache is flushed on every write.
 */
class SettingController extends Controller
{
    /** Keys the console exposes, with the input shape each expects. */
    private const DEFINITIONS = [
        'kt_engine' => ['label' => 'Knowledge tracing engine', 'type' => 'select', 'options' => ['bkt', 'dkt']],
        'at_risk_threshold' => ['label' => 'At-risk mastery threshold', 'type' => 'number', 'step' => '0.01'],
        'registration_open' => ['label' => 'Student registration open', 'type' => 'boolean'],
        'audit_retention_days' => ['label' => 'Audit retention (days)', 'type' => 'number', 'step' => '1'],
        'max_upload_size_mb' => ['label' => 'Max upload size (MB)', 'type' => 'number', 'step' => '1'],
        'ai_provider' => ['label' => 'AI provider', 'type' => 'text'],
        'ai_model' => ['label' => 'AI model', 'type' => 'text'],
    ];

    public function __construct(private readonly SystemSettingService $settings) {}

    public function index(): Response
    {
        $actor = $this->actor();

        Gate::authorize('viewAny', SystemSetting::class);

        $descriptions = SystemSetting::query()
            ->pluck('description', 'key')
            ->all();

        return Inertia::render('Admin/Settings/Index', [
            'settings' => $this->settings->all(),
            'definitions' => collect(self::DEFINITIONS)
                ->map(fn (array $definition, string $key): array => [
                    'key' => $key,
                    ...$definition,
                    'description' => $descriptions[$key] ?? null,
                ])
                ->values()
                ->all(),
            'capabilities' => [
                'can_edit' => $actor->isOwner(),
                'cache_ttl' => SystemSettingService::CACHE_TTL,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $actor = $this->actor();

        Gate::authorize('update', SystemSetting::class);

        $validated = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*' => ['nullable', Rule::anyOf(['string', 'integer', 'numeric', 'boolean'])],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $updated = 0;

        foreach ($validated['settings'] as $key => $value) {
            $this->settings->set($actor, (string) $key, $value, $validated['description'] ?? null);
            $updated++;
        }

        return back()->with('success', "{$updated} setting(s) saved. The cache was invalidated.");
    }

    private function actor(): User
    {
        /** @var User $actor */
        $actor = request()->user();

        return $actor;
    }
}
