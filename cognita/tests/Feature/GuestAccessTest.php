<?php

declare(strict_types=1);

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Every surface behind the auth middleware sends a guest to sign in, whatever
 * the role prefix or HTTP verb.
 */
class GuestAccessTest extends TestCase
{
    #[DataProvider('protectedRoutes')]
    public function test_guests_are_redirected_to_sign_in(string $method, string $uri): void
    {
        $this->{$method}($uri)->assertRedirect(route('login'));
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function protectedRoutes(): array
    {
        return [
            'instructor dashboard' => ['get', '/instructor'],
            'create a course' => ['post', '/instructor/courses'],
            'admin users' => ['get', '/admin/users'],
            'change a role' => ['patch', '/admin/users/1/role'],
            'student home' => ['get', '/my-classes'],
            'student classroom' => ['get', '/my-classes/classes/1'],
            'call token' => ['post', '/classes/1/call/token'],
            'board update' => ['patch', '/classes/1/board'],
            'post a question' => ['post', '/questions'],
        ];
    }
}
