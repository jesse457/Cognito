<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBoardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Board settings only. Ink is never sent here — it stays in the room, so a
     * `strokes` field is refused by the controller rather than validated.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'surface' => ['sometimes', 'required', 'string', 'in:canvas,pdf'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:2000'],
            'pages' => ['sometimes', 'integer', 'min:1', 'max:2000'],
            'students_can_annotate' => ['sometimes', 'boolean'],
        ];
    }
}
