<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Bootstrap the fixed local/staging accounts.
 *
 * Every account uses the password `password` (hashed by the model's `hashed`
 * cast). Idempotent: keyed by the immutable email, so re-runs update the row
 * in place instead of inserting a duplicate.
 */
class UserSeeder extends Seeder
{
    /** @var array<string, UserRole> */
    public const STAFF_EMAILS = [
        'owner@cognita.test' => UserRole::Owner,
        'admin@cognita.test' => UserRole::Admin,
        'moderator@cognita.test' => UserRole::Moderator,
        'instructor@cognita.test' => UserRole::Instructor,
    ];

    /** @var list<string> */
    public const STUDENT_EMAILS = [
        'student1@cognita.test',
        'student2@cognita.test',
        'student3@cognita.test',
    ];

    public function run(): void
    {
        $names = [
            'owner@cognita.test' => 'Cognita Owner',
            'admin@cognita.test' => 'Cognita Admin',
            'moderator@cognita.test' => 'Cognita Moderator',
            'instructor@cognita.test' => 'Cognita Instructor',
            'student1@cognita.test' => 'Student One',
            'student2@cognita.test' => 'Student Two',
            'student3@cognita.test' => 'Student Three',
        ];

        foreach (self::STAFF_EMAILS as $email => $role) {
            $this->upsertUser($email, $names[$email], $role);
        }

        foreach (self::STUDENT_EMAILS as $index => $email) {
            $this->upsertUser(
                $email,
                $names[$email],
                UserRole::Student,
                // The first student gets a display name so UI "show the display
                // label" paths are exercised by the seed data.
                $index === 0 ? 'Ace Learner' : null,
            );
        }
    }

    /**
     * Create-or-update one fixed account.
     */
    private function upsertUser(
        string $email,
        string $name,
        UserRole $role,
        ?string $displayName = null,
    ): User {
        /** @var User $user */
        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => 'password',
                'role' => $role,
                'display_name' => $displayName,
                'status' => UserStatus::Active,
                'suspended_until' => null,
                'email_verified_at' => now(),
            ],
        );

        return $user;
    }
}
