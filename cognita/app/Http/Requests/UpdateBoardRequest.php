<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\BoardSurface;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'surface' => ['sometimes', 'required', Rule::enum(BoardSurface::class)],
            'page' => ['sometimes', 'integer', 'min:1', 'max:2000'],
            'pages' => ['sometimes', 'integer', 'min:1', 'max:2000'],
        ];
    }
}
