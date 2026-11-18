<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadCourseMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:160'],
            'lesson_id' => ['required', 'integer', 'exists:lessons,id'],
            'document' => ['required', 'file', 'mimes:pdf,doc,docx,ppt,pptx,mp4,webm,jpg,jpeg,png,zip', 'max:102400'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'document.mimes' => 'Upload a PDF, document, slide deck, video, image or zip file.',
            'document.max' => 'The file must be smaller than 100 MB.',
        ];
    }
}
