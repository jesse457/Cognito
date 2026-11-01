<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JoinClassTest extends TestCase
{
    use RefreshDatabase;

    public function test_join_codes_are_six_unambiguous_characters(): void
    {
        $code = Classroom::generateJoinCode();

        $this->assertSame(6, strlen($code));
        $this->assertMatchesRegularExpression('/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/', $code);
    }

    public function test_join_codes_are_normalised_before_lookup(): void
    {
        $this->assertSame('PHY101', Classroom::normalizeJoinCode(' phy-101 '));
        $this->assertSame('ABC234', Classroom::normalizeJoinCode('abc 234'));
    }

    public function test_a_student_joins_a_class_with_its_key(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['join_code' => 'PHY101']);

        $this->actingAs($student)
            ->post('/join', ['key' => 'phy-101'])
            ->assertRedirect(route('call.show', ['classroom' => $classroom->id]));

        $this->assertDatabaseHas('enrollments', [
            'classroom_id' => $classroom->id,
            'student_id' => $student->id,
        ]);
    }

    public function test_joining_twice_does_not_duplicate_membership(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['join_code' => 'KEY123']);

        $this->actingAs($student)->post('/join', ['key' => 'KEY123']);
        $this->actingAs($student)->post('/join', ['key' => 'KEY123']);

        $this->assertSame(1, Enrollment::query()->count());
    }

    public function test_an_unknown_key_is_rejected(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->post('/join', ['key' => 'NOPE99'])
            ->assertSessionHasErrors('key');

        $this->assertSame(0, Enrollment::query()->count());
    }

    public function test_a_guest_key_is_remembered_until_they_sign_in(): void
    {
        $classroom = Classroom::factory()->create(['join_code' => 'GUEST1']);

        $this->post('/join', ['key' => 'GUEST1'])
            ->assertRedirect(route('login'))
            ->assertSessionHas('pending_join_key', 'GUEST1');

        $student = User::factory()->student()->create(['password' => 'password']);

        $this->post('/login', ['email' => $student->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard'));

        $this->get('/dashboard')
            ->assertRedirect(route('call.show', ['classroom' => $classroom->id]));

        $this->assertDatabaseHas('enrollments', [
            'classroom_id' => $classroom->id,
            'student_id' => $student->id,
        ]);
    }

    public function test_instructors_do_not_join_with_a_key(): void
    {
        $instructor = User::factory()->instructor()->create();
        Classroom::factory()->create(['join_code' => 'TEACH1']);

        $this->actingAs($instructor)
            ->post('/join', ['key' => 'TEACH1'])
            ->assertRedirect(route('instructor.dashboard'));
    }
}
