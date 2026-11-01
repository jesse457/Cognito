<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

final class DismissReportRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'resolution_note' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'resolution_note.required' => 'A note explaining the dismissal is required.',
        ];
    }

    public function resolutionNote(): string
    {
        return (string) $this->validated('resolution_note');
    }
}
