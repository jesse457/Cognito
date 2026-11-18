<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_signed_in_user_can_see_their_profile(): void
    {
        $student = User::factory()->student()->create([
            'name' => 'Ada Student',
            'email' => 'ada@example.test',
        ]);

        $this->actingAs($student)
            ->get(route('profile'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Profile/Show')
                ->where('user.name', 'Ada Student')
                ->where('user.email', 'ada@example.test')
                ->where('user.role', 'student')
                ->where('totals.courses_teaching', 0)
                ->where('totals.classes', 0)
            );
    }

    public function test_guests_are_redirected_from_the_profile(): void
    {
        $this->get(route('profile'))->assertRedirect(route('login'));
    }
}
