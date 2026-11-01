<?php

declare(strict_types=1);

namespace App\Http\Requests\Instructor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Assign a single lesson to one student of a class.
 */
class AssignLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'lesson_id' => ['required', 'integer', 'exists:lessons,id'],
            'due_at' => ['nullable', 'date'],
        ];
    }
}
