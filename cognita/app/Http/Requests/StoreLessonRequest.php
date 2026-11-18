<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\LessonStatus;
use App\Enums\LessonType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'type' => ['required', Rule::enum(LessonType::class)],
            'status' => ['required', Rule::enum(LessonStatus::class)],
            'content' => ['nullable', 'string', 'max:50000'],
            'video_url' => ['nullable', 'url', 'max:2048'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'position' => ['nullable', 'integer', 'min:0', 'max:10000'],
        ];
    }
}
