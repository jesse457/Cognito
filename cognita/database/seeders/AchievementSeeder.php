<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Achievement;
use Illuminate\Database\Seeder;

/**
 * The two starter achievements.
 *
 * `achievements.slug` is unique, so updateOrCreate keeps this idempotent while
 * letting copy/criteria changes roll forward.
 */
class AchievementSeeder extends Seeder
{
    public function run(): void
    {
        /** @var array<string, array{name: string, description: string, criteria: array<string, mixed>}> $achievements */
        $achievements = [
            'first_quiz' => [
                'name' => 'First Quiz',
                'description' => 'Complete your very first quiz.',
                'criteria' => ['type' => 'quiz_completed', 'count' => 1],
            ],
            'seven_day_streak' => [
                'name' => 'Seven Day Streak',
                'description' => 'Practise for seven days in a row.',
                'criteria' => ['type' => 'streak', 'days' => 7],
            ],
        ];

        foreach ($achievements as $slug => $definition) {
            Achievement::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'criteria' => $definition['criteria'],
                ],
            );
        }
    }
}
