<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\UserRole;
use App\Models\ClassEnrollment;
use App\Models\ParticipantProfile;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * One instructor-owned cohort class plus the students' gamification profiles.
 *
 * Classes are matched on (instructor_id, name) so the seeded `join_code`
 * survives later runs. `class_enrollments` is unique(class_id, student_id).
 */
class PrivateClassSeeder extends Seeder
{
    public const CLASS_NAME = 'Cognita Physics Cohort';

    public const CLASS_DESCRIPTION = 'A small-group cohort working through the '
        .'Physics Foundations with AI course, with weekly live problem sessions.';

    public const MAX_STUDENTS = 50;

    public function run(): void
    {
        $instructor = User::query()
            ->where('role', UserRole::Instructor->value)
            ->orderBy('id')
            ->first();

        if ($instructor === null) {
            return;
        }

        /** @var PrivateClass $class */
        $class = PrivateClass::query()->firstOrNew([
            'instructor_id' => $instructor->getKey(),
            'name' => self::CLASS_NAME,
        ]);

        // Only set mutable attributes so an existing join_code is preserved.
        $class->fill([
            'description' => self::CLASS_DESCRIPTION,
            'max_students' => self::MAX_STUDENTS,
            'status' => ClassStatus::Active,
        ]);
        $class->save();

        $students = User::query()
            ->where('role', UserRole::Student->value)
            ->whereIn('email', UserSeeder::STUDENT_EMAILS)
            ->orderBy('id')
            ->get();

        // The first two students join the cohort as active members.
        foreach ($students->take(2) as $student) {
            ClassEnrollment::query()->updateOrCreate(
                [
                    'class_id' => $class->getKey(),
                    'student_id' => $student->getKey(),
                ],
                [
                    'status' => EnrollmentStatus::Active,
                    'enrolled_at' => now()->subDays(14),
                ],
            );
        }

        $this->seedParticipantProfiles($students);
    }

    /**
     * `participant_profiles.user_id` is unique: one profile per student.
     *
     * @param  Collection<int, User>  $students
     */
    private function seedParticipantProfiles(Collection $students): void
    {
        /** @var array<string, array{total_xp: int, current_streak: int}> $seed */
        $seed = [
            'student1@cognita.test' => ['total_xp' => 1_750, 'current_streak' => 12],
            'student2@cognita.test' => ['total_xp' => 940, 'current_streak' => 5],
            'student3@cognita.test' => ['total_xp' => 310, 'current_streak' => 0],
        ];

        foreach ($students as $student) {
            $values = $seed[$student->email] ?? ['total_xp' => 0, 'current_streak' => 0];
            $totalXp = $values['total_xp'];

            ParticipantProfile::query()->updateOrCreate(
                ['user_id' => $student->getKey()],
                [
                    'total_xp' => $totalXp,
                    // Matches the gamification rule: one level per 500 XP.
                    'current_level' => (int) floor($totalXp / 500) + 1,
                    'current_streak' => $values['current_streak'],
                    'last_activity_date' => $values['current_streak'] > 0
                        ? now()->toDateString()
                        : now()->subDays(9)->toDateString(),
                ],
            );
        }
    }
}
