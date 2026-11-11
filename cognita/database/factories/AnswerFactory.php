<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Answer>
 */
class AnswerFactory extends Factory
{
    /** @var class-string<Answer> */
    protected $model = Answer::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'question_id' => Question::factory(),
            'user_id' => User::factory()->student(),
            'body' => $this->faker->paragraph(2),
            'is_accepted' => false,
        ];
    }
}
