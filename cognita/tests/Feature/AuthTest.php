<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_see_the_welcome_page(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->component('Welcome'));
    }

    public function test_sign_up_creates_a_student_and_lands_on_the_class_key_page(): void
    {
        $response = $this->post('/register', [
            'name' => 'Ada Lovelace',
            'email' => 'ada@cognita.test',
            'password' => 'correct-horse',
            'password_confirmation' => 'correct-horse',
        ]);

        $response->assertRedirect(route('student.home'));
        $this->assertAuthenticated();

        $this->assertDatabaseHas('users', [
            'email' => 'ada@cognita.test',
            'role' => UserRole::Student->value,
        ]);
    }

    public function test_sign_in_routes_each_role_to_its_own_surface(): void
    {
        foreach ([
            UserRole::Admin->value => 'admin.dashboard',
            UserRole::Instructor->value => 'instructor.dashboard',
            UserRole::Student->value => 'student.home',
        ] as $role => $routeName) {
            $user = User::factory()->create(['password' => 'password', 'role' => $role]);

            $this->post('/login', ['email' => $user->email, 'password' => 'password'])
                ->assertRedirect(route('dashboard'));

            $this->get('/dashboard')->assertRedirect(route($routeName));

            $this->post('/logout');
        }
    }

    public function test_bad_credentials_are_rejected(): void
    {
        $user = User::factory()->create(['password' => 'password']);

        $this->post('/login', ['email' => $user->email, 'password' => 'nope'])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }
}
