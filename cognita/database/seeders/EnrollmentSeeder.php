<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Enrol every seeded student on the seeded AI course.
 *
 * `enrollments` is unique(user_id, course_id), so firstOrCreate() keeps this
 * idempotent and leaves the original `enrolled_at` untouched on re-runs.
 */
class EnrollmentSeeder extends Seeder
{
    public function run(): void
    {
        $course = Course::query()->where('title', CourseSeeder::COURSE_TITLE)->first();

        if ($course === null) {
            return;
        }

        $students = User::query()
            ->where('role', UserRole::Student->value)
            ->whereIn('email', UserSeeder::STUDENT_EMAILS)
            ->orderBy('id')
            ->get();

        foreach ($students as $index => $student) {
            Enrollment::query()->firstOrCreate(
                [
                    'user_id' => $student->getKey(),
                    'course_id' => $course->getKey(),
                ],
                [
                    // Spread the enrolment dates so dashboards are not flat.
                    'enrolled_at' => now()->subDays(21 - ($index * 7)),
                ],
            );
        }
    }
}
