<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\KtEngine;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\KnowledgeComponent;
use App\Models\StudentKcMastery;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Optional mastery rows so the admin / instructor dashboards have data.
 *
 * unique(user_id, knowledge_component_id) is honoured with updateOrCreate, so
 * re-running only refreshes the probabilities.
 */
class KnowledgeTracingSeeder extends Seeder
{
    /**
     * Deliberately uneven: student1 starts strong, student3 starts below the
     * at-risk threshold so the "needs attention" views are populated.
     *
     * @var array<int, list<float>> index of student => probability per KC
     */
    private const PROBABILITIES = [
        [0.82, 0.74, 0.91, 0.68],
        [0.55, 0.48, 0.62, 0.51],
        [0.22, 0.31, 0.18, 0.42],
    ];

    public function run(): void
    {
        $course = Course::query()->where('title', CourseSeeder::COURSE_TITLE)->first();

        if ($course === null) {
            return;
        }

        $components = KnowledgeComponent::query()
            ->where('course_id', $course->getKey())
            ->orderBy('id')
            ->get();

        if ($components->isEmpty()) {
            return;
        }

        $students = User::query()
            ->where('role', UserRole::Student->value)
            ->whereIn('email', UserSeeder::STUDENT_EMAILS)
            ->orderBy('id')
            ->get();

        foreach ($students->values() as $studentIndex => $student) {
            $probabilities = self::PROBABILITIES[$studentIndex] ?? self::PROBABILITIES[1];

            foreach ($components->values() as $componentIndex => $component) {
                StudentKcMastery::query()->updateOrCreate(
                    [
                        'user_id' => $student->getKey(),
                        'knowledge_component_id' => $component->getKey(),
                    ],
                    [
                        'mastery_probability' => $probabilities[$componentIndex] ?? 0.5,
                        'model_used' => KtEngine::Bkt,
                        'last_updated' => now()->subHours($componentIndex + 1),
                    ],
                );
            }
        }
    }
}
