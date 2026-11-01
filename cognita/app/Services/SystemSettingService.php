<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SystemSetting;
use App\Models\User;
use App\Support\AdminContext;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Owner-only key/value system settings.
 *
 * The whole key => value map is cached under one key for 60 seconds and flushed
 * on every write/reset, so a single owner change is visible immediately while
 * read-heavy paths (KT config, thresholds) stay off the database.
 */
final class SystemSettingService
{
    public const CACHE_KEY = 'cognita.system_settings';

    /** Seconds the settings map stays cached. */
    public const CACHE_TTL = 60;

    public function __construct(
        private readonly AdminScopeService $scope,
        private readonly AuditLogService $auditLog,
        private readonly AdminContext $adminContext,
    ) {}

    public function get(string $key, mixed $default = null): mixed
    {
        $settings = $this->map();

        return array_key_exists($key, $settings) ? $settings[$key] : $default;
    }

    public function set(User $actor, string $key, mixed $value, ?string $description = null): SystemSetting
    {
        $this->scope->assertCanAccessSettings($actor);

        $key = trim($key);

        abort_if($key === '', 422, 'A setting key is required.');

        $previous = SystemSetting::query()->where('key', $key)->first();
        $oldValue = $previous?->value;

        $setting = $this->transaction(function () use ($actor, $key, $value, $description, $previous, $oldValue): SystemSetting {
            $setting = $previous ?? new SystemSetting(['key' => $key]);

            $setting->fill([
                'key' => $key,
                'value' => $this->normaliseValue($value),
                'description' => $description ?? $setting->description,
                'updated_by' => $actor->getKey(),
                'updated_at' => now(),
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'setting.update',
                target: null,
                context: [
                    'key' => $key,
                    'old' => $this->unwrap($oldValue),
                    'new' => $this->unwrap($setting->value),
                    'created' => $previous === null,
                ],
            );

            return $setting->refresh();
        });

        $this->flushCache();

        return $setting;
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return $this->map();
    }

    public function reset(User $actor, string $key): SystemSetting
    {
        $this->scope->assertCanAccessSettings($actor);

        $key = trim($key);

        $existing = SystemSetting::query()->where('key', $key)->firstOrFail();
        $oldValue = $existing->value;

        $setting = $this->transaction(function () use ($actor, $existing, $key, $oldValue): SystemSetting {
            // "Reset" restores the platform default: an empty JSON array.
            $existing->fill([
                'value' => [],
                'updated_by' => $actor->getKey(),
                'updated_at' => now(),
            ])->save();

            $this->auditLog->record(
                actor: $actor,
                action: 'setting.update',
                target: null,
                context: [
                    'key' => $key,
                    'old' => $this->unwrap($oldValue),
                    'new' => [],
                    'reset' => true,
                ],
            );

            return $existing->refresh();
        });

        $this->flushCache();

        return $setting;
    }

    public function flushCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * The cached key => value map.
     *
     * @return array<string, mixed>
     */
    private function map(): array
    {
        /** @var array<string, mixed> $settings */
        $settings = Cache::remember(
            self::CACHE_KEY,
            self::CACHE_TTL,
            fn (): array => $this->loadFromDatabase(),
        );

        return $settings;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadFromDatabase(): array
    {
        $map = [];

        /** @var iterable<SystemSetting> $rows */
        $rows = SystemSetting::query()->orderBy('key')->get();

        foreach ($rows as $row) {
            $map[$row->key] = $this->unwrap($row->value);
        }

        return $map;
    }

    /**
     * Unwraps the `{"value": <scalar>}` envelope used for scalar settings.
     */
    private function unwrap(mixed $value): mixed
    {
        if (is_array($value) && count($value) === 1 && array_key_exists('value', $value)) {
            return $value['value'];
        }

        return $value;
    }

    /**
     * The `value` column is a JSON array cast, so scalars are stored wrapped in
     * `{"value": <scalar>}` and unwrapped again on read.
     *
     * @return array<string, mixed>
     */
    private function normaliseValue(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        return ['value' => $value];
    }

    /**
     * @template TReturn
     *
     * @param  callable(): TReturn  $callback
     * @return TReturn
     */
    private function transaction(callable $callback): mixed
    {
        return $this->adminContext->runWithoutModelAudit(
            static fn (): mixed => DB::transaction(static fn (): mixed => $callback()),
        );
    }
}
