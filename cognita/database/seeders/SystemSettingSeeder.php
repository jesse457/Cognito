<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Owner-managed system settings defaults.
 *
 * VALUE SHAPE — `system_settings.value` is a JSON column cast to `array` on the
 * model, so every row is stored as a single-key wrapper object:
 *
 *     value = ['value' => <scalar>]
 *
 * The admin SystemSettingService reads `$model->value` as an array and pulls the
 * scalar out of the `value` key. Keep this shape for every setting (including
 * booleans and numbers) so nothing has to special-case scalars.
 *
 * `system_settings` has no `created_at`; `updated_at` exists and is bumped on
 * every write.
 */
class SystemSettingSeeder extends Seeder
{
    /**
     * @var array<string, array{value: scalar, description: string}>
     */
    public const SETTINGS = [
        'kt_engine' => [
            'value' => 'bkt',
            'description' => 'Knowledge-tracing engine: bkt (CPU) or dkt (GPU).',
        ],
        'at_risk_threshold' => [
            'value' => 0.6,
            'description' => 'Mastery probability below which a student is flagged at risk.',
        ],
        'registration_open' => [
            'value' => true,
            'description' => 'Whether public student registration is accepting new accounts.',
        ],
        'audit_retention_days' => [
            'value' => 365,
            'description' => 'Number of days admin_audit_logs rows are retained before pruning.',
        ],
        'max_upload_size_mb' => [
            'value' => 25,
            'description' => 'Maximum size in megabytes of a single RAG document upload.',
        ],
        'ai_provider' => [
            'value' => 'openai',
            'description' => 'Provider used for AI course generation and embeddings.',
        ],
        'ai_model' => [
            'value' => 'gpt-4o',
            'description' => 'Model used for AI course generation.',
        ],
    ];

    public function run(): void
    {
        $owner = User::query()
            ->where('role', UserRole::Owner->value)
            ->orderBy('id')
            ->first();

        foreach (self::SETTINGS as $key => $definition) {
            SystemSetting::query()->updateOrCreate(
                ['key' => $key],
                [
                    'value' => ['value' => $definition['value']],
                    'description' => $definition['description'],
                    'updated_by' => $owner?->getKey(),
                    'updated_at' => now(),
                ],
            );
        }
    }
}
