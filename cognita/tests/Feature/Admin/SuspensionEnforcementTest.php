<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature test 11 — suspension / ban enforcement on every authenticated route.
 */
class SuspensionEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_suspended_user_is_blocked_everywhere_except_account_and_logout(): void
    {
        $user = User::factory()->suspended(7)->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/courses')->assertForbidden();
        $this->actingAs($user, 'sanctum')->getJson('/api/me')->assertForbidden();

        $this->actingAs($user, 'sanctum')->getJson('/api/account')->assertOk();
        $this->actingAs($user, 'sanctum')->postJson('/api/logout')->assertOk();
    }

    public function test_access_is_restored_once_the_suspension_elapsed(): void
    {
        $user = User::factory()->create([
            'status' => UserStatus::Suspended,
            'suspended_until' => now()->subMinute(),
        ]);

        $this->assertFalse($user->hasActiveSuspension());

        $this->actingAs($user, 'sanctum')->getJson('/api/courses')->assertOk();
    }

    public function test_a_banned_user_is_rejected_indefinitely(): void
    {
        $user = User::factory()->banned()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/courses')->assertForbidden();
        $this->actingAs($user, 'sanctum')->getJson('/api/account')->assertForbidden();
        $this->actingAs($user, 'sanctum')->postJson('/api/logout')->assertForbidden();

        $this->travel(365)->days();

        $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/courses')->assertForbidden();
    }

    public function test_a_banned_user_cannot_log_in(): void
    {
        $user = User::factory()->banned()->create(['email' => 'banned@cognita.test']);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertForbidden();
    }

    public function test_registration_creates_a_student_even_if_a_role_is_supplied(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'New Student',
            'email' => 'new.student@cognita.test',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'owner',
        ])->assertCreated();

        $this->assertSame('student', $response->json('data.user.role'));

        $this->assertDatabaseHas('users', [
            'email' => 'new.student@cognita.test',
            'role' => 'student',
        ]);
    }
}
