<?php

declare(strict_types=1);

namespace App\Http\Requests\Instructor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Assign a course to a whole class. Capacity rules live in
 * ContentAssignmentService and surface as 422 ValidationException.
 */
class AssignCourseRequest extends FormRequest
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
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'due_at' => ['nullable', 'date'],
        ];
    }
}
