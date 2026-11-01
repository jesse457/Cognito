<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\SystemSetting;
use App\Models\User;
use App\Services\SystemSettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Feature test 15 — owner-only system settings, cached for 60s and invalidated
 * on write.
 */
class SystemSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_the_owner_can_read_and_write_settings(): void
    {
        $owner = User::factory()->owner()->create();
        $admin = User::factory()->admin()->create();
        $moderator = User::factory()->moderator()->create();

        $this->actingAs($owner, 'sanctum')->getJson('/api/admin/settings')->assertOk();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/settings')->assertForbidden();
        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => ['registration_open' => false]])
            ->assertForbidden();

        $this->actingAs($moderator, 'sanctum')->getJson('/api/admin/settings')->assertForbidden();

        $this->actingAs($owner, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => ['registration_open' => false]])
            ->assertSuccessful();

        $this->assertSame(false, SystemSetting::query()->where('key', 'registration_open')->first()?->value['value']);
    }

    public function test_values_are_cached_and_the_cache_is_invalidated_on_write(): void
    {
        $owner = User::factory()->owner()->create();

        SystemSetting::query()->create([
            'key' => 'at_risk_threshold',
            'value' => ['value' => 0.6],
            'description' => 'Threshold',
            'updated_by' => $owner->getKey(),
            'updated_at' => now(),
        ]);

        $service = app(SystemSettingService::class);

        $this->assertSame(0.6, $service->get('at_risk_threshold'));

        // Populate the cache, then change the row behind the service's back:
        // the cached read must still return the old value.
        $service->all();
        $this->assertTrue(Cache::has(SystemSettingService::CACHE_KEY));

        SystemSetting::query()->where('key', 'at_risk_threshold')->first()
            ?->forceFill(['value' => ['value' => 0.2]])->save();

        $this->assertSame(0.6, $service->get('at_risk_threshold'));

        // A service write must invalidate the cache immediately.
        $service->set($owner, 'at_risk_threshold', 0.33);

        $this->assertFalse(Cache::has(SystemSettingService::CACHE_KEY));
        $this->assertSame(0.33, $service->get('at_risk_threshold'));
    }

    public function test_the_settings_endpoint_returns_the_unwrapped_map(): void
    {
        $owner = User::factory()->owner()->create();

        SystemSetting::query()->create([
            'key' => 'kt_engine',
            'value' => ['value' => 'bkt'],
            'description' => 'KT engine',
            'updated_by' => $owner->getKey(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertOk();

        $this->assertSame('bkt', $response->json('data.kt_engine'));
    }

    public function test_a_setting_write_is_audited(): void
    {
        $owner = User::factory()->owner()->create();

        $this->actingAs($owner, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => ['max_upload_size_mb' => 50]])
            ->assertSuccessful();

        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $owner->getKey(),
            'action' => 'setting.update',
        ]);
    }
}
