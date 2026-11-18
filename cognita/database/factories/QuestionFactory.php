<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Group;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Question>
 */
class QuestionFactory extends Factory
{
    /** @var class-string<Question> */
    protected $model = Question::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'group_id' => Group::factory(),
            'user_id' => User::factory()->student(),
            'title' => rtrim($this->faker->sentence(8), '.'),
            'body' => $this->faker->paragraphs(2, true),
            'tags' => $this->faker->randomElements(
                ['momentum', 'energy', 'friction', 'kinematics', 'exam', 'revision'],
                2,
            ),
        ];
    }

    /** A general community post, visible to everyone without joining a group. */
    public function general(): static
    {
        return $this->state(fn (): array => ['group_id' => null]);
    }
}
