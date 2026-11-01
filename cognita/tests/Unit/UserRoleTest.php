<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\UserRole;
use PHPUnit\Framework\TestCase;

class UserRoleTest extends TestCase
{
    public function test_the_app_has_exactly_three_roles(): void
    {
        $this->assertSame(['student', 'instructor', 'admin'], UserRole::assignable());
    }

    public function test_labels_are_human_readable(): void
    {
        $this->assertSame('Student', UserRole::Student->label());
        $this->assertSame('Instructor', UserRole::Instructor->label());
        $this->assertSame('Admin', UserRole::Admin->label());
    }
}
