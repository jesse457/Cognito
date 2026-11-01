<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_students_cannot_reach_the_admin_or_instructor_surfaces(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)->get('/admin')->assertForbidden();
        $this->actingAs($student)->get('/admin/users')->assertForbidden();
        $this->actingAs($student)->get('/instructor')->assertForbidden();
        $this->actingAs($student)->get('/instructor/courses')->assertForbidden();
    }

    public function test_instructors_cannot_reach_the_admin_surface_or_the_student_door(): void
    {
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor)->get('/admin')->assertForbidden();
        $this->actingAs($instructor)->get('/my-classes')->assertForbidden();
    }

    public function test_admins_cannot_reach_teaching_or_student_surfaces(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->get('/my-classes')->assertForbidden();
        $this->actingAs($admin)->get('/instructor')->assertForbidden();
        $this->actingAs($admin)->get('/admin')->assertOk();
    }

    public function test_a_student_cannot_open_a_call_for_a_class_they_never_joined(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertForbidden();
    }
}
