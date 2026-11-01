<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClassroomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Only the instructor's own courses are selectable for a new class.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->user();

        return [
            'name' => ['required', 'string', 'max:120'],
            'course_id' => [
                'nullable',
                'integer',
                Rule::exists('courses', 'id')->where('instructor_id', $user->getKey()),
            ],
        ];
    }
}
