<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ClassBoard;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * One teaching example: a course, a class with a memorable key, two students
 * inside it, and a board that starts on the notebook surface.
 *
 * Idempotent: the course and the class are matched on their stable names, so
 * the seeded class key survives a re-run.
 */
class DemoClassroomSeeder extends Seeder
{
    public const COURSE_TITLE = 'Foundations of Applied Physics';

    public const CLASSROOM_NAME = 'Physics Cohort A';

    public const JOIN_CODE = 'PHY101';

    public function run(): void
    {
        $instructor = User::query()->where('email', 'instructor@cognita.test')->first();

        if ($instructor === null) {
            return;
        }

        $course = Course::query()->updateOrCreate(
            ['title' => self::COURSE_TITLE, 'instructor_id' => $instructor->getKey()],
            [
                'description' => 'Mechanics, momentum and energy, taught live twice a week with '
                    .'problem sessions on the shared board.',
            ],
        );

        /** @var Classroom $classroom */
        $classroom = Classroom::query()->firstOrNew([
            'instructor_id' => $instructor->getKey(),
            'name' => self::CLASSROOM_NAME,
        ]);

        $classroom->fill(['course_id' => $course->getKey()]);
        $classroom->join_code = self::JOIN_CODE;
        $classroom->save();

        ClassBoard::query()->updateOrCreate(
            ['classroom_id' => $classroom->getKey()],
            [
                'surface' => 'notebook',
                'title' => 'Notebook',
                'students_can_annotate' => true,
            ],
        );

        foreach (['student1@cognita.test', 'student2@cognita.test'] as $email) {
            $student = User::query()->where('email', $email)->first();

            if ($student === null) {
                continue;
            }

            Enrollment::query()->firstOrCreate(
                [
                    'classroom_id' => $classroom->getKey(),
                    'student_id' => $student->getKey(),
                ],
                ['joined_at' => now()->subDays(9)],
            );
        }
    }
}
