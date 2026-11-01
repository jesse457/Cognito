<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * NOTE: deliberately does NOT use the WithoutModelEvents trait. That trait
 * suppresses model events for every nested `$this->call()`, which would skip
 * the `creating` hooks that generate `private_classes.join_code` and
 * `staff_invitations.token`.
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Order matters: users first (every later seeder resolves actors by role),
     * then the course tree, enrolments, mastery, the cohort class, achievements,
     * system settings, and finally the moderation samples.
     *
     * Every seeder is idempotent, so `db:seed` may be re-run safely.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            CourseSeeder::class,
            EnrollmentSeeder::class,
            KnowledgeTracingSeeder::class,
            PrivateClassSeeder::class,
            AchievementSeeder::class,
            SystemSettingSeeder::class,
            ContentReportSeeder::class,
        ]);
    }
}
