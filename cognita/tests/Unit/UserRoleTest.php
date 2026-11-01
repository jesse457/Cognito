<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\UserRole;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class UserRoleTest extends TestCase
{
    public function test_ranks_match_the_documented_hierarchy(): void
    {
        $this->assertSame(0, UserRole::Student->rank());
        $this->assertSame(1, UserRole::Instructor->rank());
        $this->assertSame(2, UserRole::Moderator->rank());
        $this->assertSame(3, UserRole::Admin->rank());
        $this->assertSame(4, UserRole::Owner->rank());
    }

    public function test_at_least_is_inclusive_and_transitive(): void
    {
        $this->assertTrue(UserRole::Owner->atLeast(UserRole::Owner));
        $this->assertTrue(UserRole::Admin->atLeast(UserRole::Moderator));
        $this->assertTrue(UserRole::Moderator->atLeast(UserRole::Student));
        $this->assertFalse(UserRole::Moderator->atLeast(UserRole::Admin));
        $this->assertFalse(UserRole::Student->atLeast(UserRole::Instructor));
    }

    public function test_staff_boundary_is_moderator_and_above(): void
    {
        $this->assertFalse(UserRole::Student->isStaff());
        $this->assertFalse(UserRole::Instructor->isStaff());
        $this->assertTrue(UserRole::Moderator->isStaff());
        $this->assertTrue(UserRole::Admin->isStaff());
        $this->assertTrue(UserRole::Owner->isStaff());
    }

    public function test_string_values_are_stable(): void
    {
        $this->assertSame('student', UserRole::Student->value);
        $this->assertSame('instructor', UserRole::Instructor->value);
        $this->assertSame('moderator', UserRole::Moderator->value);
        $this->assertSame('admin', UserRole::Admin->value);
        $this->assertSame('owner', UserRole::Owner->value);
        $this->assertSame(['admin', 'moderator'], UserRole::invitableValues());
    }

    /** @return array<string, array{UserRole, UserRole, bool}> */
    public static function comparisons(): array
    {
        return [
            'owner over admin' => [UserRole::Owner, UserRole::Admin, true],
            'admin over owner' => [UserRole::Admin, UserRole::Owner, false],
            'moderator over student' => [UserRole::Moderator, UserRole::Student, true],
            'instructor over moderator' => [UserRole::Instructor, UserRole::Moderator, false],
        ];
    }

    #[DataProvider('comparisons')]
    public function test_comparisons(UserRole $actor, UserRole $target, bool $expected): void
    {
        $this->assertSame($expected, $actor->atLeast($target));
    }
}
