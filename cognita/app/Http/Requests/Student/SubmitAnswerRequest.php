<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAnswerRequest extends FormRequest
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
            'question_payload' => ['nullable', 'array'],
            'question_payload.id' => ['nullable'],
            'question_payload.question' => ['nullable', 'string'],
            'question_payload.correct_option_index' => ['nullable', 'integer', 'min:0', 'max:3'],
            'user_answer' => ['required', 'array'],
            'user_answer.selected_option_index' => ['nullable', 'integer', 'min:0', 'max:3'],
            'is_correct' => ['nullable', 'boolean'],
            'time_taken_ms' => ['required', 'integer', 'min:0', 'max:3600000'],
            'knowledge_component_id' => ['nullable', 'integer', 'exists:knowledge_components,id'],
        ];
    }
}
