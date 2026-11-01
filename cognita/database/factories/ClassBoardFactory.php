<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ClassBoard;
use App\Models\Classroom;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClassBoard>
 */
class ClassBoardFactory extends Factory
{
    /** @var class-string<ClassBoard> */
    protected $model = ClassBoard::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'classroom_id' => Classroom::factory(),
            'surface' => 'canvas',
            'title' => 'Canvas',
            'students_can_annotate' => false,
            'strokes' => [],
        ];
    }
}
