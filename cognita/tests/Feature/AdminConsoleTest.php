<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminConsoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_promotes_a_student_to_instructor(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->student()->create();

        $this->actingAs($admin)
            ->patch("/admin/users/{$student->id}/role", ['role' => 'instructor'])
            ->assertRedirect();

        $this->assertSame(UserRole::Instructor, $student->fresh()->role);
    }

    public function test_an_admin_cannot_change_their_own_role(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->patch("/admin/users/{$admin->id}/role", ['role' => 'student'])
            ->assertSessionHasErrors('role');

        $this->assertSame(UserRole::Admin, $admin->fresh()->role);
    }

    public function test_the_last_admin_cannot_be_deleted(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->admin()->create(['email' => 'second@cognita.test']);

        $this->actingAs($admin)->delete("/admin/users/{$admin->id}")->assertSessionHasErrors('user');
        $this->actingAs($other)->delete("/admin/users/{$admin->id}")->assertRedirect();

        $this->assertDatabaseMissing('users', ['id' => $admin->id]);
    }

    public function test_deleting_a_student_removes_their_memberships(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);

        $this->actingAs($admin)->delete("/admin/users/{$student->id}")->assertRedirect();

        $this->assertDatabaseCount('enrollments', 0);
    }

    public function test_the_inventory_pages_render(): void
    {
        $admin = User::factory()->admin()->create();
        Course::factory()->create();
        Classroom::factory()->create();

        $this->actingAs($admin)->get('/admin/courses')->assertOk();
        $this->actingAs($admin)->get('/admin/classrooms')->assertOk();
        $this->actingAs($admin)->get('/admin/users')->assertOk();
    }
}
