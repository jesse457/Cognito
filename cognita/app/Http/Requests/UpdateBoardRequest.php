<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateBoardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Partial updates are allowed: the host changes surface/page/permission,
     * an annotating student sends only strokes.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'surface' => ['sometimes', 'required', 'string', 'in:canvas,notebook,pdf'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:2000'],
            'pages' => ['sometimes', 'integer', 'min:1', 'max:2000'],
            'students_can_annotate' => ['sometimes', 'boolean'],
            'strokes' => ['sometimes', 'array', 'max:4000'],
        ];
    }

    /**
     * A stroke list is capped so one oversized payload cannot stall the board.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->has('strokes')) {
                    return;
                }

                $encoded = json_encode($this->input('strokes'));

                if ($encoded !== false && strlen($encoded) > 1_500_000) {
                    $validator->errors()->add('strokes', 'This board is too large to save. Clear a page and try again.');
                }
            },
        ];
    }
}
