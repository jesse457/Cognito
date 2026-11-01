<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * The fixed local accounts. Every password is `password`.
 *
 * Idempotent: keyed on the immutable email, so re-running updates in place.
 */
class UserSeeder extends Seeder
{
    /** @var array<string, array{name: string, role: UserRole}> */
    public const ACCOUNTS = [
        'admin@cognita.test' => ['name' => 'Amara Okafor', 'role' => UserRole::Admin],
        'instructor@cognita.test' => ['name' => 'Dr. Lena Fischer', 'role' => UserRole::Instructor],
        'student1@cognita.test' => ['name' => 'Mateo Rivera', 'role' => UserRole::Student],
        'student2@cognita.test' => ['name' => 'Priya Raman', 'role' => UserRole::Student],
        'student3@cognita.test' => ['name' => 'Noah Bergstrom', 'role' => UserRole::Student],
    ];

    public function run(): void
    {
        foreach (self::ACCOUNTS as $email => $account) {
            User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => $account['name'],
                    'password' => 'password',
                    'role' => $account['role'],
                    'email_verified_at' => now(),
                ],
            );
        }
    }
}
